import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const KEY_LIGHT_CONFIG = {
  color: 0xffffff,
  intensity: 3.0,
  position: { x: 5, y: 8, z: 4 },
  shadowMapSize: 2048,
  shadowBias: -0.0001,
  shadowNormalBias: 0.02,
  shadowRadius: 2.5
};

const FILL_LIGHT_CONFIG = {
  color: 0x9bb0c9,
  intensity: 1.5,
  position: { x: -4, y: 3, z: -2 }
};

const RIM_LIGHT_CONFIG = {
  color: 0xffeedd,
  intensity: 2.0,
  position: { x: 0, y: 4, z: -6 }
};

const ENV_LIGHT_INTENSITY = 0.8;

export async function setupLighting(scene, renderer) {
  try {
    await setupEnvironmentLighting(scene, renderer);
  } catch (error) {
    console.warn('HDR environment failed to load, using fallback:', error.message);
    setupFallbackEnvironment(scene, renderer);
  }

  addKeyLight(scene);
  addFillLight(scene);
  addRimLight(scene);
  
  // Set the environment map as the scene background for visual consistency
  scene.background = scene.environment;
  
  return scene;
}

async function setupEnvironmentLighting(scene, renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();
    
    loader.load(
      '/hdri.hdr',
      (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        
        scene.environment = envMap;
        scene.environmentIntensity = ENV_LIGHT_INTENSITY;
        
        texture.dispose();
        pmremGenerator.dispose();
        
        resolve(envMap);
      },
      undefined,
      () => {
        pmremGenerator.dispose();
        reject(new Error('HDR file not found'));
      }
    );
  });
}

function setupFallbackEnvironment(scene, renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  
  const envScene = new THREE.Scene();
  
  const topColor = new THREE.Color(0x4a6b8a);
  const bottomColor = new THREE.Color(0x1a1a1a);
  const horizonColor = new THREE.Color(0x2d4a5a);
  
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, `#${topColor.getHexString()}`);
  gradient.addColorStop(0.4, `#${horizonColor.getHexString()}`);
  gradient.addColorStop(0.5, `#${horizonColor.getHexString()}`);
  gradient.addColorStop(1, `#${bottomColor.getHexString()}`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  scene.environmentIntensity = ENV_LIGHT_INTENSITY * 1.5;
  
  texture.dispose();
  pmremGenerator.dispose();
}

function addKeyLight(scene) {
  const keyLight = new THREE.DirectionalLight(
    KEY_LIGHT_CONFIG.color,
    KEY_LIGHT_CONFIG.intensity
  );
  
  keyLight.position.set(
    KEY_LIGHT_CONFIG.position.x,
    KEY_LIGHT_CONFIG.position.y,
    KEY_LIGHT_CONFIG.position.z
  );
  
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = KEY_LIGHT_CONFIG.shadowMapSize;
  keyLight.shadow.mapSize.height = KEY_LIGHT_CONFIG.shadowMapSize;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 50;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.bias = KEY_LIGHT_CONFIG.shadowBias;
  keyLight.shadow.normalBias = KEY_LIGHT_CONFIG.shadowNormalBias;
  keyLight.shadow.radius = KEY_LIGHT_CONFIG.shadowRadius;
  
  scene.add(keyLight);
  
  return keyLight;
}

function addFillLight(scene) {
  const fillLight = new THREE.DirectionalLight(
    FILL_LIGHT_CONFIG.color,
    FILL_LIGHT_CONFIG.intensity
  );
  
  fillLight.position.set(
    FILL_LIGHT_CONFIG.position.x,
    FILL_LIGHT_CONFIG.position.y,
    FILL_LIGHT_CONFIG.position.z
  );
  
  fillLight.castShadow = false;
  
  scene.add(fillLight);
  
  return fillLight;
}

function addRimLight(scene) {
  const rimLight = new THREE.DirectionalLight(
    RIM_LIGHT_CONFIG.color,
    RIM_LIGHT_CONFIG.intensity
  );
  
  rimLight.position.set(
    RIM_LIGHT_CONFIG.position.x,
    RIM_LIGHT_CONFIG.position.y,
    RIM_LIGHT_CONFIG.position.z
  );
  
  rimLight.castShadow = false;
  
  scene.add(rimLight);
  
  return rimLight;
}
