import { loadSettings, updateSettings } from '../storage';

const enabledInput = document.getElementById('enabled') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const helpText = document.getElementById('help-text') as HTMLParagraphElement;
const reconnectButton = document.getElementById('reconnect') as HTMLButtonElement;

async function checkConnection(): Promise<boolean> {
  const settings = await loadSettings();
  const url = `ws://127.0.0.1:${settings.serverPort}`;

  return new Promise<boolean>((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 2000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send(JSON.stringify({ type: 'ping' }));
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

async function refreshUi(): Promise<void> {
  const settings = await loadSettings();
  enabledInput.checked = settings.enabled;

  const connected = await checkConnection();

  statusEl.textContent = connected
    ? 'Connected to desktop app'
    : 'Desktop app not connected';
  statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;

  helpText.textContent = connected
    ? 'Open any YouTube video to see floating captions.'
    : 'Start the Always On Subtitles desktop app, then click Reconnect.';
}

enabledInput.addEventListener('change', async () => {
  await updateSettings({ enabled: enabledInput.checked });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'settings_changed' });
    }
  });
  await refreshUi();
});

reconnectButton.addEventListener('click', async () => {
  await refreshUi();
});

void refreshUi();
