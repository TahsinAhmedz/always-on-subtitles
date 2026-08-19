import type { CaptionSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

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
  void notifySettingsChanged();
}

async function notifySettingsChanged(): Promise<void> {
  try {
    const { emit } = await import('@tauri-apps/api/event');
    await emit('settings-update', {});
  } catch {
    // Running in browser-only dev mode without Tauri
  }
}

export function updateSettings(partial: Partial<CaptionSettings>): CaptionSettings {
  const next = { ...loadSettings(), ...partial };
  saveSettings(next);
  return next;
}
