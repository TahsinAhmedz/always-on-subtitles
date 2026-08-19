import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

export type SettingsUpdateCallback = () => void;

let settingsApi:
  | {
      emitUpdate: () => Promise<void>;
      listenUpdate: (callback: SettingsUpdateCallback) => Promise<() => void>;
      getCurrentWindowLabel: () => Promise<string>;
    }
  | undefined;

async function loadSettingsApi() {
  if (settingsApi) {
    return settingsApi;
  }

  try {
    const windowApi = getCurrentWindow();
    settingsApi = {
      emitUpdate: async () => {
        await emit('settings-update', {});
      },
      listenUpdate: async (callback) => {
        return listen('settings-update', () => callback());
      },
      getCurrentWindowLabel: async () => windowApi.label,
    };
  } catch {
    // Running in browser-only dev mode without Tauri.
    settingsApi = {
      emitUpdate: async () => {},
      listenUpdate: async () => () => {},
      getCurrentWindowLabel: async () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('label') ?? 'caption';
      },
    };
  }

  return settingsApi;
}

export async function emitSettingsUpdate(): Promise<void> {
  const api = await loadSettingsApi();
  await api.emitUpdate();
}

export async function listenSettingsUpdate(
  callback: SettingsUpdateCallback,
): Promise<() => void> {
  const api = await loadSettingsApi();
  return api.listenUpdate(callback);
}

export async function getCurrentWindowLabel(): Promise<string> {
  const api = await loadSettingsApi();
  return api.getCurrentWindowLabel();
}
