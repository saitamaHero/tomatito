//! Ventana flotante. El contenido lo decide el frontend (`update_float`); aquí se
//! crea la ventana, se coloca y se mueve. La página mide la píldora y pide su
//! tamaño con `float_layout`.

use std::{
    fs, io,
    path::PathBuf,
    sync::{Mutex, MutexGuard},
    thread,
};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

use crate::{
    desktop,
    geometry::{self, Area, Edge, Rect},
};

pub const LABEL: &str = "float";

// Medidas lógicas.
/// Margen transparente para la sombra. Igual que `--pad` en `FloatApp.vue`.
const PAD: f64 = 12.0;
/// Distancia al borde cuando está pegada. No menos que `PAD`: KWin empuja hacia
/// dentro las ventanas que se salen del escritorio, aunque sea por el margen.
const GAP: f64 = PAD;
/// A esta distancia del borde se pega al soltarla.
const REACH: f64 = 16.0;
/// Distancia a la esquina la primera vez.
const MARGIN: f64 = 24.0;

#[derive(Default)]
pub struct Float(Mutex<State>);

#[derive(Default)]
struct State {
    /// Lo último que mandó el frontend; `None` si no debe verse.
    view: Option<Value>,
    created: bool,
    /// `None` hasta que la página mide la píldora por primera vez.
    place: Option<Place>,
    /// Del cursor a la esquina de la píldora, mientras se arrastra.
    grab: Option<(i32, i32)>,
    /// Último tamaño de la ventana que confirmó el sistema.
    size: PhysicalSize<u32>,
}

/// Dónde está la píldora. Se guarda en disco.
#[derive(Clone, Copy, Serialize, Deserialize)]
struct Place {
    #[serde(flatten)]
    rect: Rect,
    edge: Option<Edge>,
}

#[derive(Serialize)]
pub struct Init {
    view: Option<Value>,
    docked: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Drag {
    /// Dónde se agarró la píldora, desde su esquina y en píxeles lógicos.
    Start {
        x: f64,
        y: f64,
    },
    Move,
    End,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Action {
    Toggle,
    Open,
}

/// Motivo si el sistema no la admite.
#[tauri::command]
pub fn float_problem() -> Option<&'static str> {
    desktop::is_wayland()
        .then_some("En Wayland una aplicación no puede quedarse encima de las demás.")
}

#[tauri::command]
pub fn update_float(app: AppHandle, view: Option<Value>) -> tauri::Result<()> {
    if desktop::is_wayland() {
        return Ok(());
    }
    let window = app.get_webview_window(LABEL);
    let float = app.state::<Float>();
    let mut state = lock(&float);
    state.view = view;

    match (window, &state.view) {
        (Some(window), Some(view)) => {
            app.emit_to(LABEL, "float-view", view)?;
            // Sin colocar todavía, la muestra `float_layout`.
            if let Some(place) = state.place
                && !window.is_visible()?
            {
                show(&app, &window, place.rect)?;
            }
        }
        (Some(window), None) => {
            state.grab = None;
            window.hide()?;
        }
        (None, Some(_)) if !state.created => {
            state.created = true;
            create(app.clone());
        }
        _ => {}
    }
    Ok(())
}

/// En un hilo aparte: en Windows, crear una ventana dentro de un comando síncrono lo
/// bloquea. Y los comandos tienen que ser síncronos para no perder el orden.
fn create(app: AppHandle) {
    thread::spawn(move || {
        let built = WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::App("flotante.html".into()))
            .title("Tomatito · Ventana flotante")
            .inner_size(212.0 + 2.0 * PAD, 78.0 + 2.0 * PAD)
            .visible(false)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .visible_on_all_workspaces(true)
            .skip_taskbar(true)
            .maximizable(false)
            .minimizable(false)
            // Nunca le quita el foco a la app en la que está el usuario.
            .focused(false)
            .focusable(false)
            .accept_first_mouse(true)
            // GTK no deja cambiar el tamaño por código si no es redimensionable:
            // en Linux la fija `set_bounds` con mínimo = máximo.
            .resizable(cfg!(target_os = "linux"))
            .build();
        if let Err(error) = built {
            eprintln!("No se pudo crear la ventana flotante: {error}");
            lock(&app.state::<Float>()).created = false;
        }
    });
}

/// La página ya escucha: qué pintar de entrada.
#[tauri::command]
pub fn float_ready(app: AppHandle) -> Init {
    let float = app.state::<Float>();
    let state = lock(&float);
    let place = state.place.or_else(|| load(&app));
    Init {
        view: state.view.clone(),
        docked: place.is_some_and(|place| place.edge.is_some()),
    }
}

/// La píldora mide esto, en píxeles lógicos.
#[tauri::command]
pub fn float_layout(app: AppHandle, width: f64, height: f64) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(LABEL) else {
        return Ok(());
    };
    let areas = areas(&app)?;
    let float = app.state::<Float>();
    let mut state = lock(&float);

    let previous = state.place.or_else(|| load(&app));
    let current = previous.and_then(|place| Some((place, area_of(&place, &areas)?)));
    let place = match current {
        // A medio arrastre solo cambia el tamaño: la posición la lleva el cursor.
        Some((place, area)) if state.grab.is_some() => Place {
            rect: Rect {
                width: area.px(width),
                height: area.px(height),
                ..place.rect
            },
            ..place
        },
        Some((place, area)) => Place {
            rect: place.rect.resize_in(
                area.px(width),
                area.px(height),
                &area.rect,
                place.edge,
                area.px(GAP),
            ),
            ..place
        },
        // Primera vez, o su monitor ya no está.
        None => {
            let Some(area) = areas.first() else {
                return Ok(());
            };
            Place {
                rect: geometry::initial(
                    area.px(width),
                    area.px(height),
                    &area.rect,
                    area.px(MARGIN),
                ),
                edge: None,
            }
        }
    };

    if previous.is_some_and(|old| old.edge.is_some()) && place.edge.is_none() {
        app.emit_to(LABEL, "float-docked", false)?;
    }
    state.place = Some(place);
    if state.view.is_some() && !window.is_visible()? {
        show(&app, &window, place.rect)
    } else {
        set_bounds(&app, &window, place.rect)
    }
}

#[tauri::command]
pub fn float_drag(app: AppHandle, step: Drag) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(LABEL) else {
        return Ok(());
    };
    let float = app.state::<Float>();
    let mut state = lock(&float);
    let Some(mut place) = state.place else {
        return Ok(());
    };

    // El punto de agarre lo da la página: cuando llega aquí, el cursor ya no está ahí.
    if let Drag::Start { x, y } = step {
        let areas = areas(&app)?;
        let scale = area_of(&place, &areas).map_or(1.0, |area| area.scale);
        state.grab = Some(((x * scale).round() as i32, (y * scale).round() as i32));
        return Ok(());
    }
    let Some(grab) = state.grab else {
        return Ok(());
    };
    let cursor = app.cursor_position()?;
    let cursor = (cursor.x.round() as i32, cursor.y.round() as i32);
    place.rect.x = cursor.0 - grab.0;
    place.rect.y = cursor.1 - grab.1;

    if let Drag::Move = step {
        state.place = Some(place);
        return move_to(&app, &window, place.rect);
    }

    state.grab = None;
    let areas = areas(&app)?;
    if let Some(area) = area_of(&place, &areas) {
        place.edge = place.rect.edge_within(&area.rect, area.px(REACH));
        if let Some(edge) = place.edge {
            place.rect = place.rect.dock(&area.rect, edge, area.px(GAP));
        }
    }
    state.place = Some(place);
    move_to(&app, &window, place.rect)?;
    app.emit_to(LABEL, "float-docked", place.edge.is_some())?;
    if let Err(error) = save(&app, &place) {
        eprintln!("No se pudo guardar la posición de la ventana flotante: {error}");
    }
    Ok(())
}

/// KWin puede atender la posición antes que el tamaño y apartar la ventana porque
/// aún no cabía: con el tamaño ya aplicado se vuelve a pedir.
pub fn on_resized(app: &AppHandle, size: PhysicalSize<u32>) {
    let float = app.state::<Float>();
    // Ocupado es que el cambio viene de aquí mismo, y ya se recoloca después.
    let Ok(mut state) = float.0.try_lock() else {
        return;
    };
    // En Linux el evento llega también al mover: sin esto, recolocar lo repetiría.
    if state.size == size {
        return;
    }
    state.size = size;
    if let (Some(place), None, Some(window)) =
        (state.place, state.grab, app.get_webview_window(LABEL))
        && let Err(error) = move_to(app, &window, place.rect)
    {
        eprintln!("No se pudo recolocar la ventana flotante: {error}");
    }
}

#[tauri::command]
pub fn float_action(app: AppHandle, action: Action) {
    match action {
        Action::Toggle => desktop::send_action(&app, "toggle"),
        Action::Open => desktop::show_window(&app),
    }
}

fn lock(float: &Float) -> MutexGuard<'_, State> {
    float
        .0
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// El monitor principal va primero.
fn areas(app: &AppHandle) -> tauri::Result<Vec<Area>> {
    let primary = app.primary_monitor()?.map(|monitor| *monitor.position());
    let mut monitors = app.available_monitors()?;
    monitors.sort_by_key(|monitor| Some(*monitor.position()) != primary);
    Ok(monitors
        .iter()
        .map(|monitor| {
            let area = monitor.work_area();
            Area {
                rect: Rect::new(
                    area.position.x,
                    area.position.y,
                    area.size.width as i32,
                    area.size.height as i32,
                ),
                scale: monitor.scale_factor(),
            }
        })
        .collect())
}

fn area_of<'a>(place: &Place, areas: &'a [Area]) -> Option<&'a Area> {
    geometry::area_of(&place.rect, areas)
}

/// Margen transparente en píxeles físicos, en el monitor donde está la píldora.
fn pad(app: &AppHandle, rect: &Rect) -> tauri::Result<i32> {
    let areas = areas(app)?;
    Ok(geometry::area_of(rect, &areas).map_or(PAD as i32, |area| area.px(PAD)))
}

fn show(app: &AppHandle, window: &WebviewWindow, rect: Rect) -> tauri::Result<()> {
    set_bounds(app, window, rect)?;
    window.show()?;
    // Al volver a mostrarla, algunos gestores de ventanas la recolocan.
    move_to(app, window, rect)
}

fn move_to(app: &AppHandle, window: &WebviewWindow, rect: Rect) -> tauri::Result<()> {
    let pad = pad(app, &rect)?;
    window.set_position(PhysicalPosition::new(rect.x - pad, rect.y - pad))
}

fn set_bounds(app: &AppHandle, window: &WebviewWindow, rect: Rect) -> tauri::Result<()> {
    let pad = pad(app, &rect)?;
    let size = PhysicalSize::new(
        (rect.width + 2 * pad) as u32,
        (rect.height + 2 * pad) as u32,
    );
    if cfg!(target_os = "linux") {
        window.set_min_size(Some(size))?;
        window.set_max_size(Some(size))?;
    }
    window.set_size(size)?;
    window.set_position(PhysicalPosition::new(rect.x - pad, rect.y - pad))
}

fn file(app: &AppHandle) -> io::Result<PathBuf> {
    let dir = app.path().app_config_dir().map_err(io::Error::other)?;
    Ok(dir.join("float.json"))
}

fn save(app: &AppHandle, place: &Place) -> io::Result<()> {
    let path = file(app)?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    fs::write(path, serde_json::to_vec(place)?)
}

fn load(app: &AppHandle) -> Option<Place> {
    let bytes = fs::read(file(app).ok()?).ok()?;
    serde_json::from_slice(&bytes).ok()
}
