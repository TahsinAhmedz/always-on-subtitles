<script lang="ts">
  import { onMount } from 'svelte';
  import { onSubtitleEvent, hideCaptionWindow, showCaptionWindow } from './websocket';
  import { loadSettings } from './settings';
  import type { CaptionSettings } from './types';

  import type { SubtitleEvent } from './types';

  let text = $state('');
  let visible = $state(false);
  let dimmed = $state(false);
  let settings = $state<CaptionSettings>(loadSettings());
  const hasCaptionText = $derived(text.trim().length > 0);
  const shouldShowWindow = $derived(visible && settings.enabled && hasCaptionText);

  function handleSubtitleEvent(event: SubtitleEvent): void {
    switch (event.type) {
      case 'video_started':
        dimmed = false;
        text = '';
        visible = false;
        break;
      case 'subtitle':
        dimmed = false;
        text = event.text ?? '';
        visible = text.trim().length > 0;
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
        break;
      case 'settings_update':
        settings = loadSettings();
        break;
      default:
        break;
    }
  }

  const unsubscribeEvents = onSubtitleEvent(handleSubtitleEvent);

  $effect(() => {
    if (shouldShowWindow) {
      void showCaptionWindow();
    } else {
      void hideCaptionWindow();
    }
  });

  onMount(() => {
    let unsubscribeSettings: (() => void) | undefined;

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
    };
  });

</script>

{#if visible && settings.enabled && hasCaptionText}
  <div
    class="caption-root"
    class:dimmed
    data-tauri-drag-region
    style:--font-size="{settings.fontSize}px"
    style:--font-color={settings.fontColor}
    style:--bg-opacity={settings.backgroundOpacity}
    role="region"
    aria-live="polite"
    aria-label="Floating subtitles"
  >
    <p class="caption-text">{text}</p>
  </div>
{/if}

<style>
  :global(html),
  :global(body),
  :global(#app) {
    margin: 0;
    width: 100%;
    height: 100%;
    background: transparent !important;
    overflow: hidden;
    user-select: none;
  }

  .caption-root {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 12px 24px;
    box-sizing: border-box;
    cursor: grab;
    transition: opacity 0.2s ease;
    background: transparent;
    pointer-events: auto;
  }

  .caption-root.dimmed {
    opacity: 0.35;
  }

  .caption-text {
    margin: 0;
    max-width: min(90vw, 960px);
    padding: 12px 20px;
    border-radius: 10px;
    background: rgba(0, 0, 0, var(--bg-opacity));
    color: var(--font-color);
    font-size: var(--font-size);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 600;
    line-height: 1.4;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
