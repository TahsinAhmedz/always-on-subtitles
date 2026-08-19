export type SubtitleEventType =
  | 'video_started'
  | 'subtitle'
  | 'cues'
  | 'sync'
  | 'paused'
  | 'resumed'
  | 'video_ended'
  | 'ping'
  | 'pong';

export interface SubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
}

export interface SubtitleEvent {
  type: SubtitleEventType;
  videoId?: string;
  text?: string;
  startTime?: number;
  endTime?: number;
  title?: string;
  cues?: SubtitleCue[];
  videoTimeMs?: number;
  playing?: boolean;
  playbackRate?: number;
  timestamp?: number;
}

export interface ExtensionSettings {
  enabled: boolean;
  serverPort: number;
}

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  enabled: true,
  serverPort: 8756,
};

export const WEBSOCKET_URL = 'ws://127.0.0.1:8756';
