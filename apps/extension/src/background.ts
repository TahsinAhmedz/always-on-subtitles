import { loadSettingsSafe } from './runtime-safe';

void loadSettingsSafe();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'get_settings') {
    void loadSettingsSafe().then((settings) => {
      sendResponse(settings);
    });
    return true;
  }

  if (message?.type === 'get_status') {
    void loadSettingsSafe().then((settings) => {
      sendResponse({ enabled: settings.enabled, serverPort: settings.serverPort });
    });
    return true;
  }

  return false;
});
