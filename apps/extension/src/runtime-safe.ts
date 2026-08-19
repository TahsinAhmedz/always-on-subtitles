import { DEFAULT_EXTENSION_SETTINGS, type ExtensionSettings } from './types';

export function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function sendRuntimeMessage<T>(message: unknown): Promise<T | null> {
  if (!isExtensionContextValid()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        void chrome.runtime.lastError;
        resolve((response as T) ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

export function sendTabMessage(
  tabId: number,
  message: unknown,
  onDone?: () => void,
): void {
  if (!isExtensionContextValid()) {
    onDone?.();
    return;
  }

  try {
    chrome.tabs.sendMessage(tabId, message, () => {
      void chrome.runtime.lastError;
      onDone?.();
    });
  } catch {
    onDone?.();
  }
}

export function onRuntimeMessage(
  handler: (message: unknown) => void,
): void {
  if (!isExtensionContextValid()) {
    return;
  }

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (!isExtensionContextValid()) {
        return;
      }
      handler(message);
    });
  } catch {
    // Extension context no longer available.
  }
}

export async function loadSettingsSafe(): Promise<ExtensionSettings> {
  try {
    if (!chrome.storage?.sync) {
      return { ...DEFAULT_EXTENSION_SETTINGS };
    }
    const result = await chrome.storage.sync.get('settings');
    return {
      ...DEFAULT_EXTENSION_SETTINGS,
      ...(result.settings as ExtensionSettings | undefined),
    };
  } catch {
    return { ...DEFAULT_EXTENSION_SETTINGS };
  }
}

export async function saveSettingsSafe(settings: ExtensionSettings): Promise<void> {
  try {
    if (!chrome.storage?.sync) {
      return;
    }
    await chrome.storage.sync.set({ settings });
  } catch {
    // Ignore storage failures and keep using in-memory defaults.
  }
}
