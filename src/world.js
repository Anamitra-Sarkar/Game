import * as THREE from 'three';

/**
 * World Setup
 * Creates and manages the game world including ground plane with fog/falloff
 */

const GROUND_SIZE = 100;
const FOG_COLOR = 0x1a1a1a;
const FOG_NEAR = 30;
const FOG_FAR = 80;

export function createWorld(scene) {
  // Create ground plane at y = 0
  const groundPlane = createGroundPlane();
  scene.add(groundPlane);
  
  // Add fog for distance falloff and edge blending
  scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
  
  return { groundPlane };
}

function createGroundPlane() {
  // Large ground plane extending far enough to avoid visible edges
  const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 32, 32);
  
  // Add vertex colors for distance-based falloff at edges
  addEdgeFalloff(geometry, GROUND_SIZE);
  
  // PBR ground material with tuned roughness
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,           // Dark neutral gray
    roughness: 0.95,            // Very matte surface
    metalness: 0.0,             // Not metallic
    envMapIntensity: 0.2,       // Minimal environment reflections
    vertexColors: true,         // Enable vertex color blending
    side: THREE.DoubleSide      // Visible from both sides
  });
  
  const plane = new THREE.Mesh(geometry, material);
  
  // Position ground horizontally at y = 0
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0;
  
  // Enable shadows
  plane.receiveShadow = true;
  plane.castShadow = false;
  
  return plane;
}

/**
 * Add vertex colors to fade ground edges subtly
 */
function addEdgeFalloff(geometry, size) {
  const colors = [];
  const positions = geometry.attributes.position;
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    
    // Calculate distance from center
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    const maxDistance = size / 2;
    
    // Fade out at edges (80% to edge)
    const fadeStart = maxDistance * 0.8;
    let alpha = 1.0;
    
    if (distanceFromCenter > fadeStart) {
      const fadeDistance = maxDistance - fadeStart;
      const currentFade = distanceFromCenter - fadeStart;
      alpha = 1.0 - (currentFade / fadeDistance);
    }
    
    // Apply alpha to color (darker at edges)
    colors.push(alpha, alpha, alpha);
  }
  
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

/**
 * Update world settings
 */
export function updateWorld(scene, groundPlane, model) {
  if (!groundPlane || !model) return;
  
  // Ground is always at y = 0, no adjustment needed
  // Character should be positioned above ground
  
  // Optionally adjust fog based on scene scale
  const box = model.userData.boundingBox;
  if (box) {
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Keep fog settings, they work for most scales
    // If needed, could adjust based on maxDim
  }
}
