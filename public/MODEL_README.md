# MODEL PLACEHOLDER

This is a placeholder file. Replace this with your actual `.glb` model file.

## How to add your model:

1. Rename your GLTF Binary file to `model.glb`
2. Place it in this `/public` directory
3. Run `npm run dev` to start the viewer

## Model Requirements:

- Format: GLTF Binary (.glb) preferred
- Materials: PBR materials (metalness-roughness workflow)
- Textures: Embedded or relative paths
- Scale: Any (viewer auto-scales)

## Recommended Sources for Test Models:

- Sketchfab (https://sketchfab.com) - Many free CC models
- Mixamo (https://mixamo.com) - Free rigged characters
- Ready Player Me (https://readyplayer.me) - Avatar generator
- glTF Sample Models (https://github.com/KhronosGroup/glTF-Sample-Models)

## Notes:

- If no model.glb is found, a fallback procedural model will be displayed
- The viewer supports DRACO-compressed models
- High-poly models may affect performance on low-end devices
