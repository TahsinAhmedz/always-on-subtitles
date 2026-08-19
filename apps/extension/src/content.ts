import { sendEvent } from './websocket';
import { setSettings } from './content-settings';
import { isExtensionContextValid, onRuntimeMessage } from './runtime-safe';
import type { ExtensionSettings } from './types';
import type { SubtitleEvent } from './types';

const POLL_INTERVAL_MS = 100;
const YOUTUBE_WATCH_PATH = '/watch';

let currentVideoId: string | null = null;
let lastCueText = '';
let wasPlaying = false;
let hasStartedForCurrentVideo = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let contextInvalidated = false;

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

function getCaptionTextFromDom(): string {
  const segments = document.querySelectorAll(
    '.ytp-caption-segment, .captions-text span, .ytp-caption-window-container span',
  );

  if (segments.length === 0) {
    return '';
  }

  return Array.from(segments)
    .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function getTrackCueText(track: TextTrack): string {
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

function getCurrentCaptionText(video: HTMLVideoElement): string {
  const domText = getCaptionTextFromDom();
  if (domText) {
    return domText;
  }

  const track = getActiveTextTrack(video);
  if (!track) {
    return '';
  }

  return getTrackCueText(track);
}

function getCurrentCueTiming(video: HTMLVideoElement): { startTime?: number; endTime?: number } {
  const track = getActiveTextTrack(video);
  if (!track) {
    return { startTime: video.currentTime };
  }

  return getCueTiming(track);
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
  try {
    await sendEvent(event);
  } catch {
    // Desktop app may be offline; ignore send failures.
  }
}

function stopOnInvalidContext(): boolean {
  if (contextInvalidated || !isExtensionContextValid()) {
    contextInvalidated = true;
    stop();
    return true;
  }
  return false;
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
  if (stopOnInvalidContext()) {
    return;
  }

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

  ensureCaptionsEnabled(video);

  const text = getCurrentCaptionText(video);
  if (text && text !== lastCueText) {
    lastCueText = text;
    const timing = getCurrentCueTiming(video);
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
    void poll().catch(() => {
      stop();
    });
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

onRuntimeMessage((message) => {
  const payload = message as { type?: string; settings?: ExtensionSettings };
  if (payload?.type === 'settings_changed' && payload.settings) {
    setSettings(payload.settings);
    lastCueText = '';
  }
});

start();
observeNavigation();

window.addEventListener('beforeunload', () => {
  stop();
  void emit({ type: 'video_ended' });
});
