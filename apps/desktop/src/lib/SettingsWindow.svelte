<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getExtensionInstallInfo,
    getServerStatus,
    onServerError,
    openBrowserExtensionsPage,
    revealExtensionFolder,
  } from './websocket';
  import { loadSettings, updateSettings } from './settings';
  import type { CaptionSettings } from './types';

  let settings = $state<CaptionSettings>(loadSettings());
  let serverRunning = $state(false);
  let serverPort = $state(8756);
  let savedMessage = $state('');
  let setupMessage = $state('');
  let extensionPath = $state('');
  let extensionReady = $state(false);
  let isFirstRun = $state(localStorage.getItem('aos-first-run-complete') !== 'true');
  let serverError = $state('');

  onMount(() => {
    void Promise.all([refreshStatus(), refreshExtensionInfo()]);

    const unsubscribe = onServerError((message) => {
      serverError = message;
      serverRunning = false;
    });

    return () => {
      unsubscribe();
    };
  });

  async function refreshStatus() {
    try {
      const status = await getServerStatus();
      serverRunning = status.running;
      serverPort = status.port;
      if (serverRunning) {
        serverError = '';
      }
    } catch {
      serverRunning = false;
    }
  }

  async function refreshExtensionInfo() {
    try {
      const info = await getExtensionInstallInfo();
      extensionPath = info.path;
      extensionReady = info.exists;
    } catch {
      extensionReady = false;
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

  async function openExtensionFolder() {
    setupMessage = '';
    try {
      extensionPath = await revealExtensionFolder();
      extensionReady = true;
      localStorage.setItem('aos-first-run-complete', 'true');
      isFirstRun = false;
      setupMessage = 'Extension folder opened in Finder. Continue with step 2 below.';
    } catch (error) {
      setupMessage =
        error instanceof Error
          ? error.message
          : 'Extension not built yet. Run `npm run build:extension` from the project root.';
    }
  }

  async function openExtensionsPage() {
    setupMessage = '';
    try {
      await openBrowserExtensionsPage();
      localStorage.setItem('aos-first-run-complete', 'true');
      isFirstRun = false;
      setupMessage = 'Enable Developer mode, then click Load unpacked and choose the extension folder.';
    } catch (error) {
      setupMessage =
        error instanceof Error
          ? error.message
          : 'Could not open the browser extensions page. Open chrome://extensions manually.';
    }
  }
</script>

<div class="settings-shell">
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
          {#if serverError}
            <p class="error-detail">{serverError}</p>
          {/if}
        </div>
        <button type="button" class="secondary" onclick={refreshStatus}>Refresh</button>
      </div>
    </section>

    <section class="card setup-card" class:highlight={isFirstRun}>
      <h2>{isFirstRun ? 'Welcome — get started' : 'Install browser extension'}</h2>
      <p>
        The extension is loaded locally during development — there is no Chrome Web Store page yet.
      </p>

      {#if !extensionReady}
        <p class="warning">
          Extension not built yet. From the project root, run:
          <code>npm run build:extension</code>
        </p>
      {:else}
        <p class="path">
          Extension folder:
          <code>{extensionPath}</code>
        </p>
      {/if}

      <div class="button-row">
        <button type="button" class="primary" onclick={openExtensionFolder}>
          1. Open extension folder
        </button>
        <button type="button" class="secondary" onclick={openExtensionsPage}>
          2. Open Chrome extensions
        </button>
      </div>

      <ol class="steps">
        <li>Install this desktop app (you're here).</li>
        <li>Build the extension if needed: <code>npm run build:extension</code>.</li>
        <li>Open the extension folder, then open Chrome extensions.</li>
        <li>Enable <strong>Developer mode</strong>, click <strong>Load unpacked</strong>, and select the folder.</li>
        <li>Open any YouTube video — captions appear automatically.</li>
      </ol>

      {#if setupMessage}
        <p class="setup-message">{setupMessage}</p>
      {/if}
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
</div>

<style>
  .settings-shell {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    background: #0f1115;
    color: #e8eaed;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  :global(html),
  :global(body),
  :global(#app) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0f1115;
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

  .setup-card.highlight {
    border-color: #3b82f6;
    box-shadow: 0 0 0 1px #3b82f644;
  }

  .card p {
    margin: 0 0 12px;
    color: #b8bcc4;
    line-height: 1.5;
  }

  .warning {
    color: #fbbf24;
  }

  .path code,
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.85rem;
    word-break: break-all;
  }

  .path code {
    display: block;
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #0f1115;
    color: #dbeafe;
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

  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
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

  .error-detail {
    margin: 8px 0 0;
    font-size: 0.85rem;
    color: #f87171;
  }

  .steps {
    margin: 16px 0 0;
    padding-left: 20px;
    color: #b8bcc4;
    line-height: 1.6;
  }

  .setup-message,
  .saved {
    margin: 12px 0 0;
    font-size: 0.9rem;
  }

  .setup-message {
    color: #93c5fd;
  }

  .saved {
    color: #22c55e;
  }
</style>
