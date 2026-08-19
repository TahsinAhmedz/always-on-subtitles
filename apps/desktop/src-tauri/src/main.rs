mod commands;
mod websocket;

use commands::{
    get_server_status, hide_caption_window_cmd, show_caption_window_cmd, show_settings_window_cmd,
    ServerState,
};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, RunEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_state = Arc::new(ServerState::default());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(server_state.clone())
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            show_caption_window_cmd,
            hide_caption_window_cmd,
            show_settings_window_cmd,
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let state = server_state.clone();

            tauri::async_runtime::spawn(async move {
                websocket::start_websocket_server(app_handle, state).await;
            });

            let show_settings = MenuItem::with_id(app, "show_settings", "Settings", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_settings, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Always On Subtitles")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show_settings" => {
                        commands::show_settings_window(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        commands::show_settings_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
                if let Some(settings) = app_handle.get_webview_window("settings") {
                    let _ = settings.hide();
                }
                if let Some(caption) = app_handle.get_webview_window("caption") {
                    let _ = caption.hide();
                }
            }
        });
}

fn main() {
    run();
}
