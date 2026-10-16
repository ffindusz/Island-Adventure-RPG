// The desktop shell only opens a window on the game's build in dist/. The game's one call of the Tauri API is to close
// that window, from Quit on the title (ADR 0006); closing the last window ends the app.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running Island Adventure");
}
