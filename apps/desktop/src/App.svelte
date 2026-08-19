<script lang="ts">
  import { onMount } from 'svelte';
  import CaptionWindow from './lib/CaptionWindow.svelte';
  import SettingsWindow from './lib/SettingsWindow.svelte';
  import { getCurrentWindowLabel } from './lib/tauri-api';

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

    try {
      windowLabel = await getCurrentWindowLabel();
    } catch {
      windowLabel = 'caption';
    }
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
        width: fit-content;
        height: fit-content;
        overflow: hidden;
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
