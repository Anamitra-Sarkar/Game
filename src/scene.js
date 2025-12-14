import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CAMERA_FOV = 45;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;

const RENDERER_CONFIG = {
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false
};

const SHADOW_MAP_SIZE = 2048;

export function initScene(container) {
  const scene = new THREE.Scene();
  // Background will be set by lighting system (HDRI or fallback)
  // Temporary dark background until HDRI loads
  scene.background = new THREE.Color(0x0a0a0a);

  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;
  
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, CAMERA_NEAR, CAMERA_FAR);
  camera.position.set(3, 2, 5);

  const renderer = new THREE.WebGLRenderer(RENDERER_CONFIG);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.1;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI * 0.9;
  controls.target.set(0, 0, 0);
  controls.update();

  const groundPlane = createGroundPlane();
  scene.add(groundPlane);

  return { scene, camera, renderer, controls, groundPlane };
}

function createGroundPlane() {
  const geometry = new THREE.PlaneGeometry(1, 1);
  
  // PBR ground material: neutral concrete/asphalt appearance
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,          // Dark neutral gray
    roughness: 0.9,            // Non-reflective, matte surface
    metalness: 0.0,            // Not metallic
    envMapIntensity: 0.3       // Minimal environment reflections
  });
  
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0;
  plane.receiveShadow = true;
  plane.castShadow = false;
  
  return plane;
}
