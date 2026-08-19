import { loadSettings, updateSettings } from '../storage';
import { connect, disconnect, getConnectionState } from '../websocket';

const enabledInput = document.getElementById('enabled') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const helpText = document.getElementById('help-text') as HTMLParagraphElement;
const reconnectButton = document.getElementById('reconnect') as HTMLButtonElement;

async function refreshUi(): Promise<void> {
  const settings = await loadSettings();
  enabledInput.checked = settings.enabled;

  await connect();
  const state = getConnectionState();

  statusEl.textContent =
    state === 'connected'
      ? 'Connected to desktop app'
      : 'Desktop app not connected';
  statusEl.className = `status ${state === 'connected' ? 'connected' : 'disconnected'}`;

  helpText.textContent =
    state === 'connected'
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
  disconnect();
  await chrome.runtime.sendMessage({ type: 'reconnect' });
  await refreshUi();
});

void refreshUi();
