use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
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

#[derive(Clone, Serialize)]
pub struct ExtensionInstallInfo {
    pub path: String,
    pub exists: bool,
    pub build_command: String,
}

fn extension_dist_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../extension/dist")
}

#[tauri::command]
pub fn get_extension_install_info() -> ExtensionInstallInfo {
    let path = extension_dist_path();
    let canonical = path.canonicalize().ok();
    let exists = canonical
        .as_ref()
        .map(|resolved| resolved.is_dir() && resolved.join("manifest.json").exists())
        .unwrap_or(false);

    ExtensionInstallInfo {
        path: canonical
            .map(|resolved| resolved.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.to_string_lossy().into_owned()),
        exists,
        build_command: "npm run build:extension".to_string(),
    }
}

#[tauri::command]
pub fn reveal_extension_folder() -> Result<String, String> {
    let info = get_extension_install_info();
    if !info.exists {
        return Err(format!(
            "Extension folder not found. Build it first with `{}` from the project root.",
            info.build_command
        ));
    }

    open_path_in_file_manager(&info.path)?;
    Ok(info.path)
}

#[tauri::command]
pub fn open_browser_extensions_page() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let opened = Command::new("open")
            .args(["-a", "Google Chrome", "chrome://extensions/"])
            .status()
            .map(|status| status.success())
            .unwrap_or(false);

        if opened {
            return Ok(());
        }

        Command::new("open")
            .arg("chrome://extensions/")
            .status()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "chrome://extensions/"])
            .status()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg("chrome://extensions/")
            .status()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("Opening the browser extensions page is not supported on this platform.".to_string())
    }
}

fn open_path_in_file_manager(path: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .status()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .status()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .status()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
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
