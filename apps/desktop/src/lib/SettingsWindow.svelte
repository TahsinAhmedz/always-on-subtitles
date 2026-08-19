<script lang="ts">
  import { onMount } from 'svelte';
  import { open } from '@tauri-apps/plugin-shell';
  import { getServerStatus } from './websocket';
  import { loadSettings, saveSettings, updateSettings } from './settings';
  import type { CaptionSettings } from './types';

  const EXTENSION_URL =
    'https://github.com/always-on-subtitles/always-on-subtitles#browser-extension';

  let settings = $state<CaptionSettings>(loadSettings());
  let serverRunning = $state(false);
  let serverPort = $state(8756);
  let savedMessage = $state('');

  onMount(async () => {
    await refreshStatus();
  });

  async function refreshStatus() {
    try {
      const status = await getServerStatus();
      serverRunning = status.running;
      serverPort = status.port;
    } catch {
      serverRunning = false;
    }
  }

  function onSettingChange<K extends keyof CaptionSettings>(
    key: K,
    value: CaptionSettings[K],
  ) {
    settings = updateSettings({ [key]: value });
    savedMessage = 'Settings saved';
    window.setTimeout(() => {
      savedMessage = '';
    }, 1500);
  }

  async function openExtensionInstall() {
    await open(EXTENSION_URL);
  }
</script>

<main class="settings">
  <header>
    <h1>Always On Subtitles</h1>
    <p class="subtitle">Floating captions for YouTube, visible anywhere on your screen.</p>
  </header>

  <section class="card status-card">
    <h2>Connection</h2>
    <div class="status-row">
      <span class:online={serverRunning} class:offline={!serverRunning}></span>
      <div>
        <p class="status-label">
          {serverRunning ? 'Desktop server running' : 'Desktop server not running'}
        </p>
        <p class="status-detail">WebSocket: 127.0.0.1:{serverPort}</p>
      </div>
      <button type="button" class="secondary" onclick={refreshStatus}>Refresh</button>
    </div>
  </section>

  <section class="card">
    <h2>Setup</h2>
    <p>Install the browser extension to send YouTube captions to this app.</p>
    <button type="button" class="primary" onclick={openExtensionInstall}>
      Install browser extension
    </button>
    <ol class="steps">
      <li>Install this desktop app (you're here).</li>
      <li>Install the browser extension.</li>
      <li>Open any YouTube video — captions appear automatically.</li>
    </ol>
  </section>

  <section class="card">
    <h2>Caption appearance</h2>

    <label>
      <span>Font size ({settings.fontSize}px)</span>
      <input
        type="range"
        min="16"
        max="48"
        step="1"
        value={settings.fontSize}
        oninput={(e) => onSettingChange('fontSize', Number(e.currentTarget.value))}
      />
    </label>

    <label>
      <span>Text color</span>
      <input
        type="color"
        value={settings.fontColor}
        oninput={(e) => onSettingChange('fontColor', e.currentTarget.value)}
      />
    </label>

    <label>
      <span>Background opacity ({Math.round(settings.backgroundOpacity * 100)}%)</span>
      <input
        type="range"
        min="0.2"
        max="1"
        step="0.05"
        value={settings.backgroundOpacity}
        oninput={(e) =>
          onSettingChange('backgroundOpacity', Number(e.currentTarget.value))}
      />
    </label>

    <label class="checkbox">
      <input
        type="checkbox"
        checked={settings.dimOnPause}
        onchange={(e) => onSettingChange('dimOnPause', e.currentTarget.checked)}
      />
      <span>Dim captions when video is paused</span>
    </label>

    <label class="checkbox">
      <input
        type="checkbox"
        checked={settings.autoHideOnPause}
        onchange={(e) => onSettingChange('autoHideOnPause', e.currentTarget.checked)}
      />
      <span>Hide captions when video is paused</span>
    </label>

    <label class="checkbox">
      <input
        type="checkbox"
        checked={settings.enabled}
        onchange={(e) => onSettingChange('enabled', e.currentTarget.checked)}
      />
      <span>Enable floating captions</span>
    </label>

    {#if savedMessage}
      <p class="saved">{savedMessage}</p>
    {/if}
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0f1115;
    color: #e8eaed;
  }

  .settings {
    max-width: 560px;
    margin: 0 auto;
    padding: 32px 24px 48px;
  }

  header h1 {
    margin: 0 0 8px;
    font-size: 1.75rem;
  }

  .subtitle {
    margin: 0 0 24px;
    color: #9aa0a6;
  }

  .card {
    background: #1a1d24;
    border: 1px solid #2a2f3a;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
  }

  .card h2 {
    margin: 0 0 12px;
    font-size: 1.1rem;
  }

  .card p {
    margin: 0 0 12px;
    color: #b8bcc4;
    line-height: 1.5;
  }

  label {
    display: block;
    margin-bottom: 16px;
  }

  label span {
    display: block;
    margin-bottom: 8px;
    font-size: 0.9rem;
    color: #c5c9d0;
  }

  input[type='range'] {
    width: 100%;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .checkbox span {
    margin: 0;
  }

  button {
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .primary {
    background: #3b82f6;
    color: white;
  }

  .secondary {
    background: #2a2f3a;
    color: #e8eaed;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-row .online,
  .status-row .offline {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .online {
    background: #22c55e;
    box-shadow: 0 0 8px #22c55e88;
  }

  .offline {
    background: #ef4444;
  }

  .status-label {
    margin: 0;
    font-weight: 600;
    color: #e8eaed;
  }

  .status-detail {
    margin: 4px 0 0;
    font-size: 0.85rem;
    color: #9aa0a6;
  }

  .steps {
    margin: 16px 0 0;
    padding-left: 20px;
    color: #b8bcc4;
    line-height: 1.6;
  }

  .saved {
    margin: 8px 0 0;
    color: #22c55e;
    font-size: 0.9rem;
  }
</style>
