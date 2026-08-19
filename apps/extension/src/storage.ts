import { loadSettingsSafe, saveSettingsSafe } from './runtime-safe';
import type { ExtensionSettings } from './types';

export async function loadSettings(): Promise<ExtensionSettings> {
  return loadSettingsSafe();
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await saveSettingsSafe(settings);
}

export async function updateSettings(
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await saveSettings(next);
  return next;
}
