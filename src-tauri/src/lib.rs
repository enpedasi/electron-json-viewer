#[tauri::command]
fn show_unsaved_dialog(file_name: String) -> u32 {
    let result = rfd::MessageDialog::new()
        .set_title("未保存の変更")
        .set_description(&format!(
            "\"{}\" に未保存の変更があります。\n保存せずに閉じますか？",
            file_name
        ))
        .set_buttons(rfd::MessageButtons::YesNoCancel)
        .set_level(rfd::MessageLevel::Warning)
        .show();

    match result {
        rfd::MessageDialogResult::Yes => 0,
        rfd::MessageDialogResult::No => 1,
        _ => 2,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![show_unsaved_dialog])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
