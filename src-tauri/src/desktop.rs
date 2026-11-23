//! Bandeja, atajo global y ventana. El reloj vive en el frontend: aquí solo se
//! pinta el estado que manda `update_tray` y se devuelven acciones con el evento
//! `desktop-action`.

use std::{fs, io};

use serde::Deserialize;
use tauri::{
    AppHandle, Emitter, Manager, Window, WindowEvent, Wry,
    menu::{CheckMenuItem, IsMenuItem, Menu, MenuItem, PredefinedMenuItem},
    plugin::TauriPlugin,
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_notification::NotificationExt;

use crate::float;

const APP_NAME: &str = "Tomatito";
const MAIN: &str = "main";

/// Igual que `PlatformStatus` en `src/platform/types.ts`.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    text: String,
    toggle_label: String,
    skip_label: String,
    can_skip: bool,
    float_on: bool,
}

/// Solo está en el estado de la app si la bandeja llegó a crearse.
struct Tray {
    icon: TrayIcon,
    time: MenuItem<Wry>,
    toggle: MenuItem<Wry>,
    skip: MenuItem<Wry>,
    float: CheckMenuItem<Wry>,
}

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    // El tiempo va también en el menú: no todos los escritorios muestran texto
    // junto al icono.
    let time = MenuItem::with_id(app, "time", APP_NAME, false, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Empezar", true, None::<&str>)?;
    let skip = MenuItem::with_id(app, "skip", "Terminar pomodoro", false, None::<&str>)?;
    let float = CheckMenuItem::with_id(app, "float", "Ventana flotante", true, true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Mostrar Tomatito", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
    let separators = [
        PredefinedMenuItem::separator(app)?,
        PredefinedMenuItem::separator(app)?,
    ];

    let mut items: Vec<&dyn IsMenuItem<Wry>> =
        vec![&time, &separators[0], &toggle, &skip, &separators[1]];
    if float::float_problem().is_none() {
        items.push(&float);
    }
    items.extend([&show as &dyn IsMenuItem<Wry>, &quit]);
    let menu = Menu::with_items(app, &items)?;

    let mut builder = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .tooltip(APP_NAME)
        // En macOS el clic abre el menú; en Windows, la ventana.
        .show_menu_on_left_click(cfg!(target_os = "macos"))
        .on_menu_event(|app, event| match event.id().as_ref() {
            action @ ("toggle" | "skip" | "float") => send_action(app, action),
            "show" => show_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
                && cfg!(not(target_os = "macos"))
            {
                show_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    let icon = builder.build(app)?;
    app.manage(Tray {
        icon,
        time,
        toggle,
        skip,
        float,
    });
    Ok(())
}

#[tauri::command]
pub fn update_tray(app: AppHandle, status: Status) -> tauri::Result<()> {
    let label = if status.text.is_empty() {
        APP_NAME
    } else {
        &status.text
    };
    let title = if status.text.is_empty() {
        APP_NAME.to_string()
    } else {
        format!("{} · {APP_NAME}", status.text)
    };

    if let Some(window) = app.get_webview_window(MAIN) {
        window.set_title(&title)?;
    }
    if let Some(tray) = app.try_state::<Tray>() {
        tray.time.set_text(label)?;
        tray.toggle.set_text(&status.toggle_label)?;
        tray.skip.set_text(&status.skip_label)?;
        tray.skip.set_enabled(status.can_skip)?;
        tray.float.set_checked(status.float_on)?;
        tray.icon.set_tooltip(Some(&title))?;
        // Junto al icono basta el tiempo: «15:12», sin la fase.
        tray.icon.set_title(status.text.split(" · ").next())?;
    }
    Ok(())
}

pub fn shortcut_plugin() -> TauriPlugin<Wry> {
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                send_action(app, "toggle");
            }
        })
        .build()
}

fn toggle_shortcut() -> Shortcut {
    let main = if cfg!(target_os = "macos") {
        Modifiers::SUPER
    } else {
        Modifiers::CONTROL
    };
    Shortcut::new(Some(main | Modifiers::ALT | Modifiers::SHIFT), Code::KeyT)
}

/// Al recargar el webview se vuelve a llamar con el atajo ya puesto: no es un error.
#[tauri::command]
pub fn set_global_shortcut(app: AppHandle, enabled: bool) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    let shortcut = toggle_shortcut();
    if enabled == shortcuts.is_registered(shortcut) {
        return Ok(());
    }
    if !enabled {
        return shortcuts.unregister(shortcut).map_err(|e| e.to_string());
    }
    // En Wayland el registro va por XWayland: no falla, pero tampoco dispara.
    if is_wayland() {
        return Err("en Wayland no hay atajos globales.".into());
    }
    shortcuts.register(shortcut).map_err(|error| {
        eprintln!("No se pudo registrar el atajo: {error}");
        "puede que otra aplicación ya lo use.".into()
    })
}

pub fn is_wayland() -> bool {
    cfg!(target_os = "linux") && std::env::var_os("WAYLAND_DISPLAY").is_some()
}

pub fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit_to(MAIN, "main-shown", ());
    }
}

/// Cerrar la ventana principal la esconde, si hay bandeja desde la que volver.
pub fn on_window_event(window: &Window, event: &WindowEvent) {
    let app = window.app_handle();
    if let WindowEvent::Resized(size) = event
        && window.label() == float::LABEL
    {
        float::on_resized(app, *size);
    }
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    if window.label() != MAIN {
        // La flotante se quita desde la bandeja o desde Ajustes.
        api.prevent_close();
    } else if app.try_state::<Tray>().is_some() && window.hide().is_ok() {
        api.prevent_close();
        notify_hidden_once(app);
    } else {
        // Si no, la flotante mantendría viva la app sin forma de volver a ella.
        app.exit(0);
    }
}

fn notify_hidden_once(app: &AppHandle) {
    match mark_notice_shown(app) {
        Ok(true) => {
            let shown = app
                .notification()
                .builder()
                .title("Tomatito sigue abierto")
                .body("El reloj no se detiene. Para cerrarlo del todo, usa «Salir» en la bandeja.")
                .show();
            if let Err(error) = shown {
                eprintln!("No se pudo avisar: {error}");
            }
        }
        Ok(false) => {}
        Err(error) => eprintln!("No se pudo guardar el aviso de la bandeja: {error}"),
    }
}

/// `true` solo la primera vez en esta instalación.
fn mark_notice_shown(app: &AppHandle) -> io::Result<bool> {
    let dir = app.path().app_config_dir().map_err(io::Error::other)?;
    fs::create_dir_all(&dir)?;
    match fs::File::create_new(dir.join("tray-notice-shown")) {
        Ok(_) => Ok(true),
        Err(error) if error.kind() == io::ErrorKind::AlreadyExists => Ok(false),
        Err(error) => Err(error),
    }
}

pub fn send_action(app: &AppHandle, action: &str) {
    if let Err(error) = app.emit("desktop-action", action) {
        eprintln!("No se pudo enviar la acción {action}: {error}");
    }
}
