import { DEFAULT_EXTENSION_SETTINGS, type ExtensionSettings } from './types';

let settings: ExtensionSettings = { ...DEFAULT_EXTENSION_SETTINGS };

export function getSettings(): ExtensionSettings {
  return settings;
}

export function setSettings(next: ExtensionSettings): void {
  settings = next;
}

export async function refreshSettingsFromBackground(): Promise<ExtensionSettings> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get_settings' });
    if (response && typeof response === 'object') {
      settings = { ...DEFAULT_EXTENSION_SETTINGS, ...response };
    }
  } catch {
    settings = { ...DEFAULT_EXTENSION_SETTINGS };
  }
  return settings;
}
