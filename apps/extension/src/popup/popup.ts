import { updateSettings } from '../storage';
import { isExtensionContextValid, sendTabMessage } from '../runtime-safe';

const enabledInput = document.getElementById('enabled') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const helpText = document.getElementById('help-text') as HTMLParagraphElement;
const reconnectButton = document.getElementById('reconnect') as HTMLButtonElement;

async function checkConnection(serverPort: number): Promise<boolean> {
  const url = `ws://127.0.0.1:${serverPort}`;

  return new Promise<boolean>((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timeout = window.setTimeout(() => {
        ws.close();
        resolve(false);
      }, 2000);

      ws.onopen = () => {
        window.clearTimeout(timeout);
        ws.send(JSON.stringify({ type: 'ping' }));
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        window.clearTimeout(timeout);
        resolve(false);
      };

      ws.onclose = () => {
        window.clearTimeout(timeout);
      };
    } catch {
      resolve(false);
    }
  });
}

async function refreshUi(): Promise<void> {
  const { loadSettings } = await import('../storage');
  const settings = await loadSettings();
  enabledInput.checked = settings.enabled;

  const connected = await checkConnection(settings.serverPort);

  statusEl.textContent = connected
    ? 'Connected to desktop app'
    : 'Desktop app not connected';
  statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;

  helpText.textContent = connected
    ? 'Open any YouTube video to see floating captions.'
    : 'Start the Always On Subtitles desktop app, then click Reconnect.';
}

enabledInput.addEventListener('change', async () => {
  const settings = await updateSettings({ enabled: enabledInput.checked });

  if (!isExtensionContextValid()) {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      sendTabMessage(tabId, { type: 'settings_changed', settings });
    }
  });

  await refreshUi();
});

reconnectButton.addEventListener('click', async () => {
  await refreshUi();
});

void refreshUi().catch(() => {
  statusEl.textContent = 'Extension unavailable';
  statusEl.className = 'status disconnected';
});
