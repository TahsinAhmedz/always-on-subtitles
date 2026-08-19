export type SubtitleEventType =
  | 'video_started'
  | 'subtitle'
  | 'paused'
  | 'resumed'
  | 'video_ended'
  | 'settings_update'
  | 'ping'
  | 'pong';

export interface SubtitleEvent {
  type: SubtitleEventType;
  videoId?: string;
  text?: string;
  startTime?: number;
  endTime?: number;
  title?: string;
  enabled?: boolean;
}

export interface CaptionSettings {
  fontSize: number;
  fontColor: string;
  backgroundOpacity: number;
  autoHideOnPause: boolean;
  dimOnPause: boolean;
  enabled: boolean;
}

export const DEFAULT_SETTINGS: CaptionSettings = {
  fontSize: 28,
  fontColor: '#ffffff',
  backgroundOpacity: 0.75,
  autoHideOnPause: false,
  dimOnPause: true,
  enabled: true,
};

export const WEBSOCKET_PORT = 8756;
export const WEBSOCKET_URL = `ws://127.0.0.1:${WEBSOCKET_PORT}`;
