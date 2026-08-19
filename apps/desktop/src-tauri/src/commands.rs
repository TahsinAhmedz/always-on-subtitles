use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};

pub const WEBSOCKET_PORT: u16 = 8756;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SubtitleEvent {
    #[serde(rename_all = "camelCase")]
    VideoStarted {
        video_id: Option<String>,
        title: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    Subtitle {
        text: Option<String>,
        start_time: Option<f64>,
        end_time: Option<f64>,
    },
    Paused,
    Resumed,
    VideoEnded,
    SettingsUpdate,
    Ping,
    Pong,
}

#[derive(Default)]
pub struct ServerState {
    pub running: AtomicBool,
}

#[derive(Clone, Serialize)]
pub struct ServerStatus {
    pub running: bool,
    pub port: u16,
}

pub fn emit_subtitle_event(app: &AppHandle, event: SubtitleEvent) {
    let _ = app.emit("subtitle-event", &event);
}

pub fn show_caption_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("caption") {
        let _ = window.show();
    }
}

pub fn hide_caption_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("caption") {
        let _ = window.hide();
    }
}

pub fn show_settings_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
pub fn get_server_status(state: State<'_, Arc<ServerState>>) -> ServerStatus {
    ServerStatus {
        running: state.running.load(Ordering::Relaxed),
        port: WEBSOCKET_PORT,
    }
}

#[tauri::command]
pub fn show_caption_window_cmd(app: AppHandle) {
    show_caption_window(&app);
}

#[tauri::command]
pub fn hide_caption_window_cmd(app: AppHandle) {
    hide_caption_window(&app);
}

#[tauri::command]
pub fn show_settings_window_cmd(app: AppHandle) {
    show_settings_window(&app);
}
