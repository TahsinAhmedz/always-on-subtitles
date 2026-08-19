import { connect, refreshConnectionSettings, sendEvent } from './background-ws';
import { loadSettingsSafe } from './runtime-safe';
import type { SubtitleEvent } from './types';

void loadSettingsSafe().then(() => connect());

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

  if (message?.type === 'subtitle_event' && message.event) {
    void sendEvent(message.event as SubtitleEvent);
    return false;
  }

  return false;
});

chrome.storage.onChanged.addListener(() => {
  refreshConnectionSettings();
});
