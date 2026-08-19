import { setSettings } from './content-settings';
import { isExtensionContextValid, onRuntimeMessage } from './runtime-safe';
import { parseYoutubeTimedText } from './youtube-cues';
import type { ExtensionSettings, SubtitleEvent } from './types';

const YOUTUBE_WATCH_PATH = '/watch';
const PAGE_HOOK_EVENT = 'aos-captions-intercepted';

let currentVideoId: string | null = null;
let lastCueText = '';
let wasPlaying = false;
let hasStartedForCurrentVideo = false;
let hasCuesLoaded = false;
let boundVideo: HTMLVideoElement | null = null;
let contextInvalidated = false;

function injectPageHook(): void {
  if (document.getElementById('aos-page-hook')) {
    return;
  }

  const script = document.createElement('script');
  script.id = 'aos-page-hook';
  script.src = chrome.runtime.getURL('page-hook.js');
  script.onload = () => script.remove();
  (document.documentElement || document.head).appendChild(script);
}

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

function emit(event: SubtitleEvent): void {
  if (!isExtensionContextValid()) {
    return;
  }

  try {
    chrome.runtime.sendMessage({ type: 'subtitle_event', event }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // Extension context may be invalidated after reload.
  }
}

function resetVideoState(): void {
  currentVideoId = null;
  lastCueText = '';
  hasStartedForCurrentVideo = false;
  wasPlaying = false;
  hasCuesLoaded = false;
  boundVideo = null;
}

function handleVideoChange(videoId: string): void {
  currentVideoId = videoId;
  lastCueText = '';
  wasPlaying = false;
  hasStartedForCurrentVideo = false;
  hasCuesLoaded = false;
  boundVideo = null;
}

function emitVideoStarted(videoId: string): void {
  emit({
    type: 'video_started',
    videoId,
    title: getVideoTitle(),
  });
}

function sendVideoSync(video: HTMLVideoElement): void {
  emit({
    type: 'sync',
    videoId: currentVideoId ?? getVideoId() ?? undefined,
    videoTimeMs: video.currentTime * 1000,
    playing: !video.paused && !video.ended,
    playbackRate: video.playbackRate,
    timestamp: Date.now(),
  });
}

function bindVideoSync(video: HTMLVideoElement): void {
  if (video === boundVideo) {
    return;
  }

  boundVideo = video;
  const events = ['timeupdate', 'play', 'pause', 'seeked', 'ratechange'] as const;
  for (const eventName of events) {
    video.addEventListener(eventName, () => sendVideoSync(video));
  }
  sendVideoSync(video);
}

function tryBindVideo(): void {
  const video = getVideoElement();
  if (video) {
    bindVideoSync(video);
  }
}

function getCaptionTextFromDom(): string {
  const segments = document.querySelectorAll('.ytp-caption-segment');
  if (segments.length > 0) {
    return Array.from(segments)
      .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  const captionsText = document.querySelector('.captions-text');
  return captionsText?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function stopOnInvalidContext(): boolean {
  if (contextInvalidated || !isExtensionContextValid()) {
    contextInvalidated = true;
    return true;
  }
  return false;
}

function poll(): void {
  if (stopOnInvalidContext()) {
    return;
  }

  if (!window.location.pathname.startsWith(YOUTUBE_WATCH_PATH)) {
    if (currentVideoId) {
      resetVideoState();
      emit({ type: 'video_ended' });
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
    handleVideoChange(videoId);
  }

  tryBindVideo();

  const isPlaying = !video.paused && !video.ended;
  if (isPlaying && !wasPlaying) {
    if (!hasStartedForCurrentVideo && currentVideoId) {
      hasStartedForCurrentVideo = true;
      emitVideoStarted(currentVideoId);
    } else {
      emit({ type: 'resumed' });
    }
  } else if (!isPlaying && wasPlaying) {
    emit({ type: 'paused' });
  }
  wasPlaying = isPlaying;

  if (video.ended) {
    if (currentVideoId) {
      resetVideoState();
      emit({ type: 'video_ended' });
    }
    return;
  }

  if (!isPlaying || hasCuesLoaded) {
    return;
  }

  const text = getCaptionTextFromDom();
  if (text && text !== lastCueText) {
    lastCueText = text;
    emit({
      type: 'subtitle',
      videoId,
      text,
      startTime: video.currentTime,
    });
  } else if (!text && lastCueText) {
    lastCueText = '';
  }
}

function handleInterceptedCues(data: unknown): void {
  const cues = parseYoutubeTimedText(data);
  if (cues.length === 0) {
    return;
  }

  hasCuesLoaded = true;
  lastCueText = '';
  emit({
    type: 'cues',
    videoId: getVideoId() ?? undefined,
    cues,
  });
}

function observeNavigation(): void {
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      resetVideoState();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

injectPageHook();

window.addEventListener(PAGE_HOOK_EVENT, (event) => {
  const detail = (event as CustomEvent<{ data?: unknown }>).detail;
  if (detail?.data) {
    handleInterceptedCues(detail.data);
  }
});

onRuntimeMessage((message) => {
  const payload = message as { type?: string; settings?: ExtensionSettings };
  if (payload?.type === 'poll') {
    poll();
    return;
  }
  if (payload?.type === 'settings_changed' && payload.settings) {
    setSettings(payload.settings);
    lastCueText = '';
    hasCuesLoaded = false;
  }
});

if (document.body) {
  observeNavigation();
} else {
  window.addEventListener('DOMContentLoaded', observeNavigation, { once: true });
}

window.addEventListener('beforeunload', () => {
  contextInvalidated = true;
  emit({ type: 'video_ended' });
});

poll();
