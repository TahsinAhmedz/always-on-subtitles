<script lang="ts">
  import { onMount } from 'svelte';
  import { LogicalSize } from '@tauri-apps/api/dpi';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { onSubtitleEvent, hideCaptionWindow, showCaptionWindow } from './websocket';
  import { loadSettings } from './settings';
  import type { CaptionSettings, SubtitleCue, SubtitleEvent } from './types';

  let text = $state('');
  let visible = $state(false);
  let dimmed = $state(false);
  let settings = $state<CaptionSettings>(loadSettings());
  let cues = $state<SubtitleCue[]>([]);
  let useCuePlayback = $state(false);
  let syncState = $state({
    videoTimeMs: 0,
    playing: false,
    playbackRate: 1,
    syncedAt: 0,
  });

  const hasCaptionText = $derived(text.trim().length > 0);
  const shouldShowWindow = $derived(visible && settings.enabled && hasCaptionText);

  function estimatedTimeMs(): number {
    if (!syncState.playing) {
      return syncState.videoTimeMs;
    }
    const elapsed = performance.now() - syncState.syncedAt;
    return syncState.videoTimeMs + elapsed * syncState.playbackRate;
  }

  function findCueText(timeMs: number): string {
    if (cues.length === 0) {
      return '';
    }

    let low = 0;
    let high = cues.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (cues[mid].startMs <= timeMs) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    if (low === 0) {
      return '';
    }

    const cue = cues[low - 1];
    if (timeMs < cue.endMs) {
      return cue.text;
    }
    if (low < cues.length) {
      return cue.text;
    }
    return '';
  }

  function updateTextFromCues(): void {
    if (!useCuePlayback) {
      return;
    }

    const nextText = findCueText(estimatedTimeMs());
    text = nextText;
    visible = nextText.trim().length > 0;
  }

  function handleSubtitleEvent(event: SubtitleEvent): void {
    switch (event.type) {
      case 'video_started':
        dimmed = false;
        text = '';
        visible = false;
        cues = [];
        useCuePlayback = false;
        break;
      case 'cues':
        dimmed = false;
        cues = [...(event.cues ?? [])].sort((a, b) => a.startMs - b.startMs);
        useCuePlayback = cues.length > 0;
        updateTextFromCues();
        break;
      case 'sync':
        syncState = {
          videoTimeMs: event.videoTimeMs ?? 0,
          playing: event.playing ?? false,
          playbackRate: event.playbackRate ?? 1,
          syncedAt: performance.now(),
        };
        updateTextFromCues();
        break;
      case 'subtitle':
        if (!useCuePlayback) {
          dimmed = false;
          text = event.text ?? '';
          visible = text.trim().length > 0;
        }
        break;
      case 'paused':
        if (settings.autoHideOnPause) {
          visible = false;
        } else if (settings.dimOnPause) {
          dimmed = true;
        }
        break;
      case 'resumed':
        dimmed = false;
        visible = text.trim().length > 0;
        break;
      case 'video_ended':
        visible = false;
        text = '';
        cues = [];
        useCuePlayback = false;
        break;
      case 'settings_update':
        settings = loadSettings();
        break;
      default:
        break;
    }
  }

  const unsubscribeEvents = onSubtitleEvent(handleSubtitleEvent);

  function startDrag(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    void getCurrentWindow().startDragging();
  }

  function fitCaptionWindow(card: HTMLElement) {
    let frame = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const width = Math.max(Math.ceil(rect.width), 200);
        const height = Math.max(Math.ceil(rect.height), 48);
        void getCurrentWindow().setSize(new LogicalSize(width, height));
      });
    };

    const observer = new ResizeObserver(() => apply());
    observer.observe(card);
    apply();

    return {
      destroy() {
        observer.disconnect();
        cancelAnimationFrame(frame);
      },
    };
  }

  $effect(() => {
    if (shouldShowWindow) {
      void showCaptionWindow();
    } else {
      void hideCaptionWindow();
    }
  });

  onMount(() => {
    let unsubscribeSettings: (() => void) | undefined;
    let animationFrame = 0;

    const tick = () => {
      if (useCuePlayback && syncState.playing) {
        updateTextFromCues();
      }
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);

    void import('@tauri-apps/api/event').then(({ listen }) =>
      listen('settings-update', () => {
        settings = loadSettings();
      }).then((unsub) => {
        unsubscribeSettings = unsub;
      }),
    );

    return () => {
      unsubscribeEvents();
      unsubscribeSettings?.();
      cancelAnimationFrame(animationFrame);
    };
  });
</script>

{#if visible && settings.enabled && hasCaptionText}
  <div
    class="caption-root"
    class:dimmed
    style:--font-size="{settings.fontSize}px"
    style:--font-color={settings.fontColor}
    style:--bg-opacity={settings.backgroundOpacity}
    role="region"
    aria-live="polite"
    aria-label="Floating subtitles"
  >
    <div
      class="caption-card"
      use:fitCaptionWindow
      data-tauri-drag-region
      onpointerdown={startDrag}
    >
      <p class="caption-text">{text}</p>
    </div>
  </div>
{/if}

<style>
  :global(html.caption-window),
  :global(html.caption-window body),
  :global(html.caption-window #app) {
    margin: 0;
    width: fit-content;
    height: fit-content;
    overflow: hidden;
    background: transparent !important;
    user-select: none;
  }

  .caption-root {
    display: block;
    width: fit-content;
    max-width: 960px;
    min-width: 200px;
    transition: opacity 0.2s ease;
    background: transparent;
  }

  .caption-root.dimmed {
    opacity: 0.35;
  }

  .caption-card {
    width: max-content;
    max-width: 960px;
    min-width: 200px;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(0, 0, 0, var(--bg-opacity));
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
    cursor: grab;
  }

  .caption-card:active {
    cursor: grabbing;
  }

  .caption-text {
    margin: 0;
    padding: 10px 20px 12px;
    color: var(--font-color);
    font-size: var(--font-size);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 600;
    line-height: 1.4;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    white-space: pre-wrap;
    word-break: break-word;
    cursor: grab;
  }

  .caption-card:active .caption-text {
    cursor: grabbing;
  }
</style>
