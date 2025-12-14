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

  return { scene, camera, renderer, controls };
}
