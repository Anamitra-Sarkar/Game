# Production-Grade WebGL 3D Game Prototype

A playable third-person game prototype built with Three.js, delivering production-quality PBR rendering and smooth gameplay entirely in the browser via WebGL.

## Quick Start

```bash
npm install
npm run dev
```

Open the browser preview. Click to lock mouse cursor, then use WASD to move and mouse to look around.

## Controls

- **Click canvas** - Enable camera control (pointer lock)
- **W/A/S/D** - Move character
- **Shift** - Sprint (faster movement)
- **Mouse** - Rotate camera around character
- **ESC** - Release camera control

## What's New - Advanced Character Animation System

This is now a **playable game prototype** with **game-quality character animation**, featuring:

### Character Movement
- Frame-rate independent movement system
- Camera-relative controls (WASD moves based on camera direction)
- **Smooth acceleration and deceleration (ease-in/ease-out)**
- **Polished rotation with angular smoothing (no snapping)**
- Walk and sprint speeds with continuous transitions

### Third-Person Camera
- Smooth follow camera with lerp interpolation
- Mouse-controlled rotation around character
- Camera stays behind and above character
- Never goes below ground level
- Pointer lock for immersive camera control

### Advanced Animation System 🆕
- **Skeletal validation with bone hierarchy logging**
- Automatic animation detection and state management
- Three animation states: Idle, Walk, Run
- **Animation speed scales with movement velocity**
- Smooth crossfade transitions between states (0.25s)
- Graceful fallback chain for models without animations

### Secondary Motion System 🆕
- **Physics-based secondary motion using spring-damper math**
- **Hair sway** - Auto-detected hair bones react to movement
- **Cloth/accessory sway** - Capes, scarves, ribbons move naturally
- **Upper body soft motion** - Spine and chest have subtle lag
- Frame-rate independent physics (uses deltaTime)
- Displacement clamping prevents instability
- No physics engine required (lightweight spring-damper implementation)

### Procedural Animation Layer 🆕
- **Upper body inertia** - Counter-rotation on turns
- **Head follow-through** - Slight lag when changing direction
- **Shoulder lag** - Subtle movement on direction changes
- Additive layer that sits on top of keyframed animation
- Never overrides base animation (non-destructive)

### World & Ground Alignment
- Ground plane fixed at y = 0 (horizontal)
- Large ground area (100x100 units) prevents visible edges
- Distance fog for atmospheric effect
- Vertex color falloff at ground edges for subtle blending
- HDRI serves as visual skybox
- Character properly grounded (not floating)

### Modular Architecture
- **input.js** - Keyboard and mouse input handling
- **characterController.js** - Character movement, rotation, and animation logic
- **animationController.js** - Animation state machine, skeletal validation, procedural offsets
- **secondaryMotion.js** - Spring-damper physics for hair/cloth/body
- **gameCamera.js** - Third-person camera system
- **world.js** - Ground plane and fog setup
- Clean separation of concerns: Input → Movement → Animation → Secondary Motion

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
│   ├── main.js         # Application entry, initialization, animation loop
│   ├── scene.js        # Scene construction, renderer config, ground plane
│   ├── lighting.js     # Lighting system (HDR environment, 3-point lighting)
│   ├── loader.js       # Model loading, processing, animations
│   └── camera.js       # Camera controller (viewer/game modes)
└── public/
    ├── model.glb       # Your 3D model (placeholder)
    ├── hdri.hdr        # HDR environment map (placeholder)
    ├── MODEL_README.md # Instructions for model replacement
    └── HDRI_README.md  # Instructions for HDR replacement
```

## Technical Implementation

### Game Loop Architecture

The game now uses a clean, modular game loop:

```javascript
function animate() {
  const deltaTime = clock.getDelta();
  
  // 1. Process Input
  // Input handled by InputManager
  
  // 2. Update Character
  characterController.update(deltaTime, inputManager);
  
  // 3. Update Camera
  gameCamera.update(deltaTime, inputManager);
  
  // 4. Render
  renderer.render(scene, camera);
}
```

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

## Comparison to Viewer vs Game Prototype

| Aspect | Previous Viewer | Current Game Prototype |
|--------|----------------|------------------------|
| Controls | OrbitControls | WASD + Mouse (game-style) |
| Camera | Free orbit | Third-person follow |
| Movement | None | Full character control |
| Animations | Detected only | Active state machine |
| Ground | Scaled to model | Fixed at y=0, extended |
| Fog | None | Distance fog enabled |
| Mode | Inspection | Playable game |

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

### Animation Requirements

For full animation system features:
- **Rigged skeleton** with bones (hips, spine, chest, neck, head, arms, legs)
- **Named bones** following common conventions (e.g., "Spine", "Head", "LeftShoulder")
- **Animation clips** named: "idle", "walk", "run" (or similar)
- **Optional**: Hair/cloth bones with names like "Hair", "Ponytail", "Cape", "Scarf"

### Secondary Motion Bone Detection

The system auto-detects bones for secondary motion based on names:
- **Hair**: "hair", "ponytail", "braid", "strand"
- **Cloth**: "cloth", "cape", "skirt", "scarf", "ribbon", "tie"
- **Upper Body**: "spine", "chest", "upperchest", "neck"

Name your bones accordingly to enable automatic physics simulation.

## Replacing the HDRI

1. Download an HDR environment map (Poly Haven, HDRI Haven, etc.)
2. Copy to `public/hdri.hdr`
3. The viewer automatically processes it for PBR lighting

If no HDRI is provided, a procedural gradient environment is used as fallback.

## Advanced Animation System Details

### Skeletal Validation
On model load, the system:
- Discovers and validates the skeleton
- Logs complete bone hierarchy with scale information
- Checks for common issues (zero scale, inverted scale, NaN values)
- Finds key bones for procedural animation (spine, chest, head, shoulders)

### Secondary Motion Physics
Uses lightweight spring-damper equations without a physics engine:
```
F = -kx - cv
```
Where:
- `k` = spring stiffness (15.0 default)
- `c` = damping coefficient (0.8 default)
- `x` = displacement from rest position
- `v` = velocity

**Features:**
- Frame-rate independent (uses deltaTime)
- Driven by character velocity and acceleration
- Displacement clamping prevents instability
- Per-bone-type configuration (hair, cloth, upper body)

### Procedural Offsets
Applied after base animation, before secondary motion:
- **Upper Body Inertia** (0.1 factor): Counter-rotation when turning
- **Head Lag** (0.15 factor): Slight delay following body rotation
- **Shoulder Lag** (0.08 factor): Subtle asymmetric movement on turns

### Movement Polish
**Smooth Rotation:**
- Angular interpolation using shortest path
- Smoothing factor (0.15) prevents snapping
- Speed-limited to feel natural

**Acceleration/Deceleration:**
- Ease-in on start (8.0 units/s²)
- Ease-out on stop (12.0 units/s² - faster than acceleration)
- Prevents instant speed changes

## Game-Ready Features & Future Hooks

### Implemented
- ✅ Character movement with WASD controls
- ✅ Sprint functionality (Shift key)
- ✅ Third-person camera with mouse look
- ✅ Animation state machine (idle/walk/run)
- ✅ Skeletal validation and bone hierarchy logging
- ✅ Secondary motion system (hair/cloth/body physics)
- ✅ Procedural animation layer (inertia, lag, follow-through)
- ✅ Smooth movement feel (acceleration/deceleration/rotation)
- ✅ Proper ground alignment at y=0
- ✅ Distance fog and edge blending
- ✅ Frame-rate independent updates

### Ready for Future Implementation
- Hooks for full physics engine integration
- IK (Inverse Kinematics) for foot placement
- Facial animation system
- Blend spaces for more animation states
- NPC spawning and management
- Interaction system (prepared in architecture)
- Additional game mechanics
- Multiplayer support foundation

### Debug Interface
Access game systems via browser console:
```javascript
window.gameDebug.inputManager          // Input system
window.gameDebug.characterController   // Character controller
window.gameDebug.animationController   // Animation state machine
window.gameDebug.secondaryMotion       // Secondary motion physics system
window.gameDebug.skeleton              // Skeleton with all bones
window.gameDebug.gameCamera            // Camera system
window.gameDebug.model                 // Character model
window.gameDebug.scene                 // Three.js scene
window.gameDebug.camera                // Three.js camera
```

**Example debugging commands:**
```javascript
// Check secondary motion stats
window.gameDebug.secondaryMotion.getStats()

// Get animation state
window.gameDebug.animationController.getCurrentState()

// List all bones
window.gameDebug.skeleton.bones.map(b => b.name)

// Get key bones
window.gameDebug.animationController.getKeyBones()

// Manually set animation speed
window.gameDebug.animationController.setAnimationSpeed(0.5)
```

## Known Limitations

- **Camera Collision**: Camera does not detect obstacles (prepared for future physics integration)
- **Single Character**: Designed for one playable character
- **No Physics**: Movement uses simple vector math; no gravity or collision yet
- **Browser Dependent**: Quality depends on user's GPU and WebGL capabilities
- **HDRI Size**: Large HDR files increase initial load time
- **Pointer Lock**: Requires user interaction (click) to enable camera control

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
