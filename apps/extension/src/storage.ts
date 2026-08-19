import { DEFAULT_EXTENSION_SETTINGS, type ExtensionSettings } from './types';

const SETTINGS_KEY = 'settings';

export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_EXTENSION_SETTINGS, ...(result[SETTINGS_KEY] as ExtensionSettings | undefined) };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function updateSettings(
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await saveSettings(next);
  return next;
}
