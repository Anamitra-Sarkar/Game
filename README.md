# Production-Grade WebGL 3D Character Viewer

A high-fidelity, real-world 3D character viewer built with Three.js, delivering production-quality PBR rendering entirely in the browser via WebGL.

## Quick Start

```bash
npm install
npm run dev
```

Open the browser preview to view the 3D character.

## Architecture

### Why Browser-Side Rendering?

This viewer renders entirely client-side using WebGL, which means:

- **No GPU required on the server** — All rendering happens in the user's browser
- **No VM dependencies** — Works in any environment that can serve static files
- **GitHub Codespaces compatible** — The dev server serves files; the browser does the heavy lifting
- **Universal accessibility** — Any modern browser with WebGL support can run this

The server (Vite dev server) only serves static assets. All 3D rendering, lighting calculations, and material processing happen in the WebGL context of the user's browser.

### Project Structure

```
├── index.html          # Entry HTML with loading UI
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite build configuration
├── src/
│   ├── main.js         # Application entry, initialization, camera setup
│   ├── scene.js        # Scene construction, renderer config, controls
│   ├── lighting.js     # Lighting system (HDR environment, 3-point lighting)
│   └── loader.js       # Model loading, processing, and centering
└── public/
    ├── model.glb       # Your 3D model (placeholder)
    ├── hdri.hdr        # HDR environment map (placeholder)
    ├── MODEL_README.md # Instructions for model replacement
    └── HDRI_README.md  # Instructions for HDR replacement
```

## Technical Implementation

### Rendering Pipeline

#### Color Management
- **Output Color Space**: sRGB for correct display on standard monitors
- **Texture Color Spaces**: Albedo/emissive maps in sRGB; normal/roughness/metalness/AO maps in linear

#### Tone Mapping
- **Algorithm**: ACESFilmic — Industry-standard filmic tone mapping that handles HDR values gracefully
- **Exposure**: 1.0 (neutral) — Tuned to prevent blown-out highlights while preserving shadow detail

#### Shadows
- **Type**: PCFSoftShadowMap — Percentage-closer filtering with soft edges
- **Resolution**: 2048×2048 — High quality without excessive GPU cost
- **Bias Configuration**: Tuned to eliminate shadow acne while minimizing peter-panning

### Lighting System

The lighting is authored as a 3-point lighting setup commonly used in photography and cinematography:

#### 1. Key Light (Main)
- **Type**: DirectionalLight
- **Intensity**: 3.0 (physically plausible for outdoor-like primary illumination)
- **Position**: Upper-right-front (classic portrait lighting angle)
- **Shadows**: Enabled with soft PCF

#### 2. Fill Light
- **Type**: DirectionalLight
- **Intensity**: 1.5 (approximately half of key to maintain contrast)
- **Color**: Slight cool tint (0x9bb0c9) — Creates natural temperature contrast
- **Position**: Lower-left-back (opposite to key)

#### 3. Rim Light (Back/Hair Light)
- **Type**: DirectionalLight
- **Intensity**: 2.0
- **Color**: Warm tint (0xffeedd) — Separates subject from background
- **Position**: Behind and above the subject

#### HDR Environment
- **Source**: User-provided .hdr file OR procedural gradient fallback
- **Processing**: PMREMGenerator converts equirectangular HDR to prefiltered mipmap chain
- **Purpose**: Provides image-based lighting for metallic reflections and diffuse ambient

### Model Handling

#### Loading
- **Loader**: GLTFLoader with DRACO support for compressed models
- **Format**: GLTF Binary (.glb) preferred for single-file deployment

#### Processing
- Automatic shadow casting/receiving on all meshes
- Normal computation if missing from geometry
- Texture color space correction
- Anisotropic filtering (16x) for texture quality at oblique angles

#### Centering & Scaling
- Bounding box computed for entire model hierarchy
- Model positioned so origin is at geometric center
- Scaled to fit within a consistent viewport size
- Camera automatically framed to model dimensions

## Comparison to Demo/Sandbox Implementations

| Aspect | This Viewer | Typical Demo |
|--------|-------------|--------------|
| Lighting | Authored 3-point + HDR | Single ambient |
| Tone Mapping | ACESFilmic, tuned | Default/none |
| Color Space | Proper sRGB workflow | Often ignored |
| Shadows | Soft PCF, high-res | Disabled/basic |
| Materials | PBR with env reflections | Basic/unlit |
| Code Structure | Modular, maintainable | Monolithic |

## Replacing the Model

1. Export your model as `.glb` (GLTF Binary)
2. Copy to `public/model.glb`
3. The viewer automatically centers and scales any model
4. No code changes required

### Material Requirements

For best results, models should use:
- **Metalness-Roughness PBR workflow** (not Specular-Glossiness)
- **Embedded textures** or correct relative paths
- **Proper UV mapping** for textured surfaces

## Replacing the HDRI

1. Download an HDR environment map (Poly Haven, HDRI Haven, etc.)
2. Copy to `public/hdri.hdr`
3. The viewer automatically processes it for PBR lighting

If no HDRI is provided, a procedural gradient environment is used as fallback.

## Known Limitations

- **No Animation Playback**: Model animations are not played (static pose only)
- **No Material Override**: Materials come from the GLTF; no runtime tweaking UI
- **Single Model**: Designed for one model at a time; no scene composition
- **Browser Dependent**: Quality depends on user's GPU and WebGL capabilities
- **HDRI Size**: Large HDR files increase initial load time

## Performance Considerations

- **Pixel Ratio**: Capped at 2.0 to balance quality vs. performance
- **Antialias**: Enabled for edge quality; may impact low-end devices
- **Shadow Maps**: 2048² is a compromise; reduce for better performance
- **DRACO Decoding**: Uses JS decoder (no WASM) for maximum compatibility

## Browser Requirements

- WebGL 2.0 support (all modern browsers)
- JavaScript ES6+ support
- Hardware acceleration recommended

## Development

```bash
npm install     # Install dependencies
npm run dev     # Start dev server with hot reload
npm run build   # Build for production
npm run preview # Preview production build
```

## License

Apache-2.0
