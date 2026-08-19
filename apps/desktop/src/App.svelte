<script lang="ts">
  import { onMount } from 'svelte';
  import CaptionWindow from './lib/CaptionWindow.svelte';
  import SettingsWindow from './lib/SettingsWindow.svelte';

  let windowLabel = $state('caption');
  const isCaptionWindow = $derived(windowLabel === 'caption');

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const labelFromUrl = params.get('label');
    if (labelFromUrl) {
      windowLabel = labelFromUrl;
      if (labelFromUrl === 'caption') {
        document.documentElement.classList.add('caption-window');
      }
      return;
    }
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    windowLabel = getCurrentWindow().label;
    if (windowLabel === 'caption') {
      document.documentElement.classList.add('caption-window');
    }
  });
</script>

<svelte:head>
  {#if isCaptionWindow}
    <style>
      html,
      body,
      #app {
        background: transparent !important;
      }
    </style>
  {/if}
</svelte:head>

{#if windowLabel === 'caption'}
  <CaptionWindow />
{:else}
  <SettingsWindow />
{/if}
