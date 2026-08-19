import { connect } from './background-ws';

const POLL_ALARM = 'caption-poll';
const POLL_INTERVAL_MS = 200;

export function startCaptionPoller(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== POLL_ALARM) {
      return;
    }
    void connect().then(() => pollYoutubeTabs());
    scheduleNextPoll();
  });

  scheduleNextPoll();
}

function scheduleNextPoll(): void {
  void chrome.alarms.clear(POLL_ALARM).then(() => {
    chrome.alarms.create(POLL_ALARM, { when: Date.now() + POLL_INTERVAL_MS });
  });
}

async function pollYoutubeTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: ['https://www.youtube.com/watch*'] });
  for (const tab of tabs) {
    if (tab.id === undefined) {
      continue;
    }
    chrome.tabs.sendMessage(tab.id, { type: 'poll' }, () => {
      void chrome.runtime.lastError;
    });
  }
}
