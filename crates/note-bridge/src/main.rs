use std::sync::Arc;

use note_bridge::BridgeState;

fn main() -> rustra::Result<()> {
    let temp_dir = std::env::temp_dir().join("note-bridge-generate");
    let state = BridgeState::new(temp_dir)?;
    let package = note_bridge::build_package(Arc::new(state));
    let generated = package.generate_typescript()?;
    generated.write_to_dir("./generated")?;
    println!("Generated TypeScript client in ./generated/");
    Ok(())
}
