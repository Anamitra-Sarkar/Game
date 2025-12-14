# HDRI PLACEHOLDER

This is a placeholder file. For optimal lighting, add an HDR environment map here.

## How to add HDRI:

1. Download an HDR environment map (see sources below)
2. Rename it to `hdri.hdr`
3. Place it in this `/public` directory
4. Restart the dev server

## Free HDR Sources:

### Poly Haven (Recommended)
- URL: https://polyhaven.com/hdris
- License: CC0 (Public Domain)
- Recommended: Indoor studio HDRIs for character viewing

### HDRI Haven
- URL: https://hdrihaven.com
- License: CC0
- Good variety of environments

### Suggested HDRIs for Character Viewing:
- Studio lights (neutral, professional)
- Soft overcast outdoor
- Interior with windows

## Fallback Behavior:

If no `hdri.hdr` file is found, the viewer will use a procedurally 
generated gradient environment map. This provides acceptable lighting
but lacks the detail and realism of a proper HDR environment.

## Technical Notes:

- File format: .hdr (Radiance HDR)
- Resolution: 2K-4K recommended (2048x1024 or higher)
- Larger files = longer load times but better reflections
