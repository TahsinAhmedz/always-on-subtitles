use crate::commands::{
    emit_server_error, emit_subtitle_event, hide_caption_window, show_caption_window, ServerState,
    SubtitleEvent, WEBSOCKET_PORT,
};
use futures_util::{SinkExt, StreamExt};
use std::net::SocketAddr;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;

pub async fn start_websocket_server(app: AppHandle, state: Arc<ServerState>) {
    let addr = SocketAddr::from(([127, 0, 0, 1], WEBSOCKET_PORT));
    let listener = match TcpListener::bind(addr).await {
        Ok(listener) => listener,
        Err(error) => {
            let message = format!("Failed to bind WebSocket server on {addr}: {error}");
            log::error!("{message}");
            emit_server_error(&app, message);
            return;
        }
    };

    state.running.store(true, Ordering::Relaxed);
    log::info!("WebSocket server listening on ws://{addr}");

    loop {
        match listener.accept().await {
            Ok((stream, _)) => {
                let app = app.clone();
                tokio::spawn(async move {
                    if let Err(error) = handle_connection(app, stream).await {
                        log::warn!("WebSocket connection error: {error}");
                    }
                });
            }
            Err(error) => {
                log::error!("Failed to accept WebSocket connection: {error}");
            }
        }
    }
}

async fn handle_connection(
    app: AppHandle,
    stream: TcpStream,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();

    while let Some(message) = read.next().await {
        let message = message?;
        if !message.is_text() {
            continue;
        }

        let text = message.into_text()?;
        let event: SubtitleEvent = match serde_json::from_str(&text) {
            Ok(event) => event,
            Err(error) => {
                log::warn!("Invalid subtitle event payload: {error}");
                continue;
            }
        };

        match &event {
            SubtitleEvent::Ping => {
                let pong = serde_json::to_string(&SubtitleEvent::Pong)?;
                write.send(Message::Text(pong.into())).await?;
            }
            SubtitleEvent::VideoStarted { .. } => {
                emit_subtitle_event(&app, event);
            }
            SubtitleEvent::Subtitle { text, .. } => {
                emit_subtitle_event(&app, event.clone());
                if text.as_ref().is_some_and(|value| !value.trim().is_empty()) {
                    show_caption_window(&app);
                } else {
                    hide_caption_window(&app);
                }
            }
            SubtitleEvent::Cues { cues, .. } => {
                emit_subtitle_event(&app, event.clone());
                if cues.iter().any(|cue| !cue.text.trim().is_empty()) {
                    show_caption_window(&app);
                }
            }
            SubtitleEvent::Sync { .. } => {
                emit_subtitle_event(&app, event);
            }
            SubtitleEvent::Paused | SubtitleEvent::Resumed => {
                emit_subtitle_event(&app, event);
            }
            SubtitleEvent::VideoEnded => {
                hide_caption_window(&app);
                emit_subtitle_event(&app, event);
            }
            SubtitleEvent::SettingsUpdate => {
                emit_subtitle_event(&app, event);
            }
            SubtitleEvent::Pong => {}
        }
    }

    Ok(())
}
