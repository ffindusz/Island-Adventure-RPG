// The desktop shell only opens a window on the game's build in dist/: the game calls no Tauri API (ADR 0006).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running Island Adventure");
}
