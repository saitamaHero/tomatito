//! Bandeja, atajo global y ventana. El reloj vive en el frontend: aquí solo se
//! pinta el estado que manda `update_tray` y se devuelven acciones con el evento
//! `desktop-action`. Tampoco hay traducciones: el texto llega con `set_labels`.

use std::{fs, io, sync::Mutex};

use serde::{Deserialize, Serialize};
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

/// Igual que `TrayLabels` en `src/platform/types.ts`.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Labels {
    show: String,
    quit: String,
    float: String,
    notice_title: String,
    notice_body: String,
}

/// Aviso de la primera vez que se cierra la ventana: título y texto.
pub struct Notice(Mutex<(String, String)>);

impl Default for Notice {
    fn default() -> Self {
        Self(Mutex::new((
            "Tomatito is still running".into(),
            "To close it completely, use “Quit” in the tray.".into(),
        )))
    }
}

/// Motivo del rechazo del atajo. Igual que `ShortcutProblem` en `types.ts`.
#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ShortcutProblem {
    Wayland,
    Taken,
    Unknown,
}

/// Solo está en el estado de la app si la bandeja llegó a crearse.
struct Tray {
    icon: TrayIcon,
    time: MenuItem<Wry>,
    toggle: MenuItem<Wry>,
    skip: MenuItem<Wry>,
    float: CheckMenuItem<Wry>,
    show: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    // El tiempo va también en el menú: no todos los escritorios muestran texto
    // junto al icono. El resto está en inglés solo hasta que llega `set_labels`.
    let time = MenuItem::with_id(app, "time", APP_NAME, false, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "Start", true, None::<&str>)?;
    let skip = MenuItem::with_id(app, "skip", "Finish pomodoro", false, None::<&str>)?;
    let float = CheckMenuItem::with_id(app, "float", "Floating window", true, true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show Tomatito", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
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
        show,
        quit,
    });
    Ok(())
}

#[tauri::command]
pub fn set_labels(app: AppHandle, labels: Labels) -> tauri::Result<()> {
    if let Some(tray) = app.try_state::<Tray>() {
        tray.show.set_text(&labels.show)?;
        tray.quit.set_text(&labels.quit)?;
        tray.float.set_text(&labels.float)?;
    }
    let notice = app.state::<Notice>();
    *notice.0.lock().unwrap_or_else(|e| e.into_inner()) = (labels.notice_title, labels.notice_body);
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
pub fn set_global_shortcut(app: AppHandle, enabled: bool) -> Result<(), ShortcutProblem> {
    let shortcuts = app.global_shortcut();
    let shortcut = toggle_shortcut();
    if enabled == shortcuts.is_registered(shortcut) {
        return Ok(());
    }
    if !enabled {
        return shortcuts.unregister(shortcut).map_err(|error| {
            eprintln!("No se pudo quitar el atajo: {error}");
            ShortcutProblem::Unknown
        });
    }
    // En Wayland el registro va por XWayland: no falla, pero tampoco dispara.
    if is_wayland() {
        return Err(ShortcutProblem::Wayland);
    }
    shortcuts.register(shortcut).map_err(|error| {
        eprintln!("No se pudo registrar el atajo: {error}");
        ShortcutProblem::Taken
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
            let notice = app.state::<Notice>();
            let (title, body) = notice.0.lock().unwrap_or_else(|e| e.into_inner()).clone();
            let shown = app.notification().builder().title(title).body(body).show();
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
