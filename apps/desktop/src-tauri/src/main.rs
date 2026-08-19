mod commands;
mod websocket;

use commands::{
    get_extension_install_info, get_server_status, hide_caption_window_cmd,
    open_browser_extensions_page, reveal_extension_folder, show_caption_window_cmd,
    show_settings_window_cmd, ServerState,
};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, window::Color,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let server_state = Arc::new(ServerState::default());

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(server_state.clone())
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            get_extension_install_info,
            reveal_extension_folder,
            open_browser_extensions_page,
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

            if let Some(caption) = app.get_webview_window("caption") {
                let _ = caption.set_background_color(Some(Color(0, 0, 0, 0)));
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {});
}

fn main() {
    env_logger::init();
    run();
}
