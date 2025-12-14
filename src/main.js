import * as THREE from 'three';
import { initScene } from './scene.js';
import { setupLighting } from './lighting.js';
import { loadModel, setMaxAnisotropy } from './loader.js';
import { InputManager } from './input.js';
import { CharacterController } from './characterController.js';
import { GameCamera } from './gameCamera.js';
import { createWorld } from './world.js';

const MODEL_PATH = '/model.glb';

const tempVector1 = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();

let inputManager = null;
let characterController = null;
let gameCamera = null;
const clock = new THREE.Clock();

async function init() {
  const container = document.getElementById('canvas-container');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const errorMessage = document.getElementById('error-message');

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    console.error(message);
  }

  function updateLoadingProgress(progress) {
    const percent = Math.round(progress * 100);
    loadingText.textContent = `Loading model... ${percent}%`;
  }

  try {
    const { scene, camera, renderer, controls } = initScene(container);
    
    setMaxAnisotropy(renderer);
    
    await setupLighting(scene, renderer);
    updateLoadingProgress(0.3);

    const model = await loadModel(MODEL_PATH, scene, (progress) => {
      updateLoadingProgress(0.3 + progress * 0.7);
    });

    // Create world (ground plane with fog)
    const { groundPlane } = createWorld(scene);

    if (model) {
      // Position character at ground level (y = 0)
      const box = model.userData.boundingBox;
      const size = box.getSize(tempVector1);
      model.position.y = size.y / 2;
      
      // Initialize game systems
      inputManager = new InputManager(renderer.domElement);
      characterController = new CharacterController(model, camera);
      gameCamera = new GameCamera(camera, model);
      
      // Disable orbit controls (we're using game camera now)
      controls.enabled = false;
    }

    loadingOverlay.classList.add('hidden');
    
    // Fade out controls info after 8 seconds
    const controlsInfo = document.getElementById('controls-info');
    if (controlsInfo) {
      setTimeout(() => {
        controlsInfo.classList.add('hidden');
      }, 8000);
    }
    
    // Expose game systems for debugging/testing
    window.gameDebug = {
      inputManager,
      characterController,
      gameCamera,
      model,
      scene,
      camera
    };
    
    function animate() {
      requestAnimationFrame(animate);
      
      const deltaTime = clock.getDelta();
      
      if (characterController && inputManager && gameCamera) {
        // Update character (movement + animations)
        characterController.update(deltaTime, inputManager);
        
        // Update camera (follow character)
        gameCamera.update(deltaTime, inputManager);
      }
      
      renderer.render(scene, camera);
    }
    
    animate();

    window.addEventListener('resize', () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });

  } catch (error) {
    loadingOverlay.classList.add('hidden');
    showError(`Failed to initialize viewer: ${error.message}`);
    console.error('Initialization error:', error);
  }
}

init();
