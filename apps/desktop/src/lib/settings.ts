import type { CaptionSettings } from '@always-on-subtitles/shared';
import { DEFAULT_SETTINGS } from '@always-on-subtitles/shared';
import { emitSettingsUpdate } from './tauri-api';

const STORAGE_KEY = 'always-on-subtitles-settings';

export function loadSettings(): CaptionSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: CaptionSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  void emitSettingsUpdate();
}

export function updateSettings(partial: Partial<CaptionSettings>): CaptionSettings {
  const next = { ...loadSettings(), ...partial };
  saveSettings(next);
  return next;
}
