mod desktop;
mod float;
mod geometry;

use tauri_plugin_window_state::StateFlags;

pub fn run() {
    tauri::Builder::default()
        // Tiene que ser el primero: una segunda copia sale antes de tocar nada más.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            desktop::show_window(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(desktop::shortcut_plugin())
        .plugin(
            // Sin VISIBLE: si se sale con la ventana oculta, al volver debe verse.
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED)
                // La flotante guarda su propia posición.
                .with_denylist(&[float::LABEL])
                .build(),
        )
        .manage(float::Float::default())
        .invoke_handler(tauri::generate_handler![
            desktop::update_tray,
            desktop::set_global_shortcut,
            float::update_float,
            float::float_problem,
            float::float_ready,
            float::float_layout,
            float::float_drag,
            float::float_action
        ])
        .setup(|app| {
            if let Err(error) = desktop::create_tray(app.handle()) {
                eprintln!("No se pudo crear la bandeja: {error}");
            }
            Ok(())
        })
        .on_window_event(desktop::on_window_event)
        .build(tauri::generate_context!())
        .expect("error al arrancar Tomatito")
        .run(|_app, _event| {
            // Clic en el icono del Dock con la ventana oculta.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = _event {
                desktop::show_window(_app);
            }
        });
}
