<script lang="ts">
  import { onMount } from 'svelte';
  import CaptionWindow from './lib/CaptionWindow.svelte';
  import SettingsWindow from './lib/SettingsWindow.svelte';

  let windowLabel = $state('caption');

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const labelFromUrl = params.get('label');
    if (labelFromUrl) {
      windowLabel = labelFromUrl;
      return;
    }
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    windowLabel = getCurrentWindow().label;
  });
</script>

{#if windowLabel === 'caption'}
  <CaptionWindow />
{:else}
  <SettingsWindow />
{/if}
