use std::net::TcpStream;
use std::time::{Duration, Instant};
use tauri::{Manager, RunEvent, Url};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

const SERVER_PORT: u16 = 17384;
const SERVER_HOST: &str = "127.0.0.1";

struct NextServer(std::sync::Mutex<Option<CommandChild>>);

fn server_url() -> String {
    format!("http://{SERVER_HOST}:{SERVER_PORT}/")
}

fn wait_for_server(timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    let addr = format!("{SERVER_HOST}:{SERVER_PORT}");

    while Instant::now() < deadline {
        if TcpStream::connect(&addr).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }

    false
}

fn spawn_next_server(app: &tauri::AppHandle) -> Result<CommandChild, String> {
    use tauri::path::BaseDirectory;

    let server_root = app
        .path()
        .resolve("next-standalone", BaseDirectory::Resource)
        .map_err(|error| error.to_string())?;
    let server_js = server_root.join("server.js");

    if !server_js.is_file() {
        return Err(format!(
            "Next.js server entry not found at {}",
            server_js.display()
        ));
    }

    let command = app
        .shell()
        .sidecar("node")
        .map_err(|error| format!("Bundled Node binary missing: {error}"))?;

    let (_rx, child) = command
        .args(["server.js"])
        .current_dir(server_root)
        .env("PORT", SERVER_PORT.to_string())
        .env("HOSTNAME", SERVER_HOST)
        .env("NODE_ENV", "production")
        .spawn()
        .map_err(|error| format!("Failed to start Next.js server: {error}"))?;

    Ok(child)
}

fn stop_next_server(state: &NextServer) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(child) = guard.take() {
            let _ = child.kill();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                return Ok(());
            }

            let handle = app.handle().clone();
            let child = spawn_next_server(&handle)?;
            app.manage(NextServer(std::sync::Mutex::new(Some(child))));

            if !wait_for_server(Duration::from_secs(90)) {
                return Err("Timed out waiting for the embedded web server".into());
            }

            let window = app
                .get_webview_window("main")
                .ok_or("Main window not found")?;
            let target = Url::parse(&server_url()).map_err(|error| error.to_string())?;
            window
                .navigate(target)
                .map_err(|error| error.to_string())?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
                if let Some(state) = app_handle.try_state::<NextServer>() {
                    stop_next_server(state.inner());
                }
            }
        });
}
