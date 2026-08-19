import { loadSettings } from './storage';

chrome.runtime.onInstalled.addListener(() => {
  void loadSettings();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'get_status') {
    void loadSettings().then((settings) => {
      sendResponse({ enabled: settings.enabled, serverPort: settings.serverPort });
    });
    return true;
  }

  return false;
});
