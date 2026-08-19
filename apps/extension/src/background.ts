import { connect, disconnect } from './websocket';
import { loadSettings } from './storage';

chrome.runtime.onInstalled.addListener(() => {
  void connect();
});

chrome.runtime.onStartup.addListener(() => {
  void connect();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'get_status') {
    void loadSettings().then((settings) => {
      sendResponse({ enabled: settings.enabled, serverPort: settings.serverPort });
    });
    return true;
  }

  if (message?.type === 'reconnect') {
    disconnect();
    void connect().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
