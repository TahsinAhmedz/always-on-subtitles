import { sendEvent } from './websocket';
import { refreshSettingsFromBackground } from './content-settings';
import type { SubtitleEvent } from './types';

const POLL_INTERVAL_MS = 100;
const YOUTUBE_WATCH_PATH = '/watch';

let currentVideoId: string | null = null;
let lastCueText = '';
let wasPlaying = false;
let hasStartedForCurrentVideo = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function getVideoId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

function getVideoElement(): HTMLVideoElement | null {
  return document.querySelector('video.html5-main-video');
}

function getVideoTitle(): string {
  const titleElement =
    document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ??
    document.querySelector('h1.title yt-formatted-string');
  return titleElement?.textContent?.trim() ?? document.title;
}

function getActiveTextTrack(video: HTMLVideoElement): TextTrack | null {
  const tracks = Array.from(video.textTracks);
  const showing = tracks.find((track) => track.mode === 'showing');
  if (showing) {
    return showing;
  }
  const hidden = tracks.find((track) => track.mode === 'hidden');
  return hidden ?? null;
}

function ensureCaptionsEnabled(video: HTMLVideoElement): TextTrack | null {
  const track = getActiveTextTrack(video);
  if (track) {
    return track;
  }

  const captionsButton = document.querySelector(
    '.ytp-subtitles-button[aria-pressed="false"]',
  ) as HTMLButtonElement | null;

  if (captionsButton) {
    captionsButton.click();
  }

  return getActiveTextTrack(video);
}

function getCurrentCueText(track: TextTrack): string {
  const activeCues = track.activeCues;
  if (!activeCues || activeCues.length === 0) {
    return '';
  }

  const texts: string[] = [];
  for (let index = 0; index < activeCues.length; index += 1) {
    const cue = activeCues[index] as VTTCue;
    if (cue.text) {
      texts.push(cue.text.replace(/<[^>]+>/g, ''));
    }
  }
  return texts.join('\n').trim();
}

function getCueTiming(track: TextTrack): { startTime?: number; endTime?: number } {
  const activeCues = track.activeCues;
  if (!activeCues || activeCues.length === 0) {
    return {};
  }
  const cue = activeCues[0] as VTTCue;
  return { startTime: cue.startTime, endTime: cue.endTime };
}

async function emit(event: SubtitleEvent): Promise<void> {
  await sendEvent(event);
}

async function handleVideoChange(videoId: string): Promise<void> {
  currentVideoId = videoId;
  lastCueText = '';
  wasPlaying = false;
  hasStartedForCurrentVideo = false;
}

async function emitVideoStarted(videoId: string): Promise<void> {
  await emit({
    type: 'video_started',
    videoId,
    title: getVideoTitle(),
  });
}

async function poll(): Promise<void> {
  if (!window.location.pathname.startsWith(YOUTUBE_WATCH_PATH)) {
    if (currentVideoId) {
      currentVideoId = null;
      lastCueText = '';
      hasStartedForCurrentVideo = false;
      wasPlaying = false;
      await emit({ type: 'video_ended' });
    }
    return;
  }

  const videoId = getVideoId();
  if (!videoId) {
    return;
  }

  const video = getVideoElement();
  if (!video) {
    return;
  }

  if (videoId !== currentVideoId) {
    await handleVideoChange(videoId);
  }

  const isPlaying = !video.paused && !video.ended;
  if (isPlaying && !wasPlaying) {
    if (!hasStartedForCurrentVideo && currentVideoId) {
      hasStartedForCurrentVideo = true;
      await emitVideoStarted(currentVideoId);
    } else {
      await emit({ type: 'resumed' });
    }
  } else if (!isPlaying && wasPlaying) {
    await emit({ type: 'paused' });
  }
  wasPlaying = isPlaying;

  if (video.ended) {
    if (currentVideoId) {
      currentVideoId = null;
      lastCueText = '';
      hasStartedForCurrentVideo = false;
      await emit({ type: 'video_ended' });
    }
    return;
  }

  if (!isPlaying) {
    return;
  }

  const track = ensureCaptionsEnabled(video);
  if (!track) {
    return;
  }

  const text = getCurrentCueText(track);
  if (text && text !== lastCueText) {
    lastCueText = text;
    const timing = getCueTiming(track);
    await emit({
      type: 'subtitle',
      videoId,
      text,
      startTime: timing.startTime,
      endTime: timing.endTime,
    });
  } else if (!text && lastCueText) {
    lastCueText = '';
  }
}

function start(): void {
  if (pollTimer) {
    return;
  }
  pollTimer = window.setInterval(() => {
    void poll();
  }, POLL_INTERVAL_MS);
}

function stop(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function observeNavigation(): void {
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      currentVideoId = null;
      lastCueText = '';
      hasStartedForCurrentVideo = false;
      wasPlaying = false;
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'settings_changed') {
    lastCueText = '';
    void refreshSettingsFromBackground();
  }
});

void refreshSettingsFromBackground().then(() => {
  start();
  observeNavigation();
});

window.addEventListener('beforeunload', () => {
  stop();
  void emit({ type: 'video_ended' });
});
