import { DEFAULT_EXTENSION_SETTINGS, type ExtensionSettings } from './types';

let settings: ExtensionSettings = { ...DEFAULT_EXTENSION_SETTINGS };

export function getSettings(): ExtensionSettings {
  return settings;
}

export function setSettings(next: ExtensionSettings): void {
  settings = { ...DEFAULT_EXTENSION_SETTINGS, ...next };
}

export function applySettingsPatch(partial: Partial<ExtensionSettings>): void {
  settings = { ...settings, ...partial };
}
