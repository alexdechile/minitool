use serde::{Deserialize, Serialize};
use palette::{Srgb, Hsl, FromColor, ShiftHue, Lighten};

#[derive(Serialize, Deserialize)]
struct ColorResult {
    hex: String,
    name: String,
    palette: Vec<String>,
    design_md: String,
}

fn to_hex(color: Srgb<f32>) -> String {
    let (r, g, b) = color.into_format::<u8>().into_components();
    format!("#{:02X}{:02X}{:02X}", r, g, b)
}

#[tauri::command]
fn analyze_color(hex: String) -> ColorResult {
    // Parse hex to Srgb
    let r = u8::from_str_radix(&hex[1..3], 16).unwrap_or(0) as f32 / 255.0;
    let g = u8::from_str_radix(&hex[3..5], 16).unwrap_or(0) as f32 / 255.0;
    let b = u8::from_str_radix(&hex[5..7], 16).unwrap_or(0) as f32 / 255.0;
    
    let base_color = Srgb::new(r, g, b);
    let hsl_base: Hsl = Hsl::from_color(base_color);

    // Get organic name
    let (r_u8, g_u8, b_u8) = base_color.into_format::<u8>().into_components();
    let name = color_name::Color::similar([r_u8, g_u8, b_u8]);

    // Generate Palette (Analogous + Complementary)
    let mut palette = Vec::new();
    
    // 1. Base
    palette.push(hex.clone());
    
    // 2. Analogous 1 (+30 deg)
    let analogous1: Srgb = Srgb::from_color(hsl_base.shift_hue(30.0));
    palette.push(to_hex(analogous1));
    
    // 3. Analogous 2 (-30 deg)
    let analogous2: Srgb = Srgb::from_color(hsl_base.shift_hue(-30.0));
    palette.push(to_hex(analogous2));
    
    // 4. Complementary (+180 deg)
    let complementary: Srgb = Srgb::from_color(hsl_base.shift_hue(180.0));
    palette.push(to_hex(complementary));
    
    // 5. Light Variation
    let light: Srgb = Srgb::from_color(hsl_base.lighten(0.2));
    palette.push(to_hex(light));

    // Generate design.md
    let palette_str = palette.iter().map(|c| format!("- {}", c)).collect::<Vec<_>>().join("\n");
    let design_md = format!(
r#"# Design Specs: {name}
## Main Color
- **Name:** {name}
- **Hex:** {hex}

## Suggested Palette
{palette_str}

## AI Prompt Context
This palette is based on the organic color '{name}'. 
Use it to create a modern, minimalist web interface. 
The main color should be used for primary actions, while the analogous colors provide depth and the complementary color serves as a high-contrast accent."#
    );

    ColorResult {
        hex,
        name: name.to_string(),
        palette,
        design_md,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_share::init())
        .plugin(tauri_plugin_sharekit::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![analyze_color])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

