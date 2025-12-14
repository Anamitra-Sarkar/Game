import * as THREE from 'three';
import { initScene } from './scene.js';
import { setupLighting } from './lighting.js';
import { loadModel, setMaxAnisotropy } from './loader.js';
import { CameraController, CameraMode } from './camera.js';

const MODEL_PATH = '/model.glb';

const tempVector1 = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();

let cameraController = null;
let mixer = null;
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
    const { scene, camera, renderer, controls, groundPlane } = initScene(container);
    
    // Initialize camera controller
    cameraController = new CameraController(camera, controls);
    
    setMaxAnisotropy(renderer);
    
    await setupLighting(scene, renderer);
    updateLoadingProgress(0.3);

    const model = await loadModel(MODEL_PATH, scene, (progress) => {
      updateLoadingProgress(0.3 + progress * 0.7);
    });

    if (model) {
      adjustCameraToModel(camera, controls, model);
      adjustGroundToModel(groundPlane, model);
      
      // Set model as camera target for future game mode
      cameraController.setTarget(model);
      
      // Store mixer reference if animations exist
      if (model.userData.hasAnimations) {
        mixer = model.userData.mixer;
      }
    }

    loadingOverlay.classList.add('hidden');
    
    // Expose camera controller to window for debugging/testing
    window.gameDebug = {
      cameraController,
      model,
      mixer,
      CameraMode
    };
    
    function animate() {
      requestAnimationFrame(animate);
      
      const deltaTime = clock.getDelta();
      
      // Update animation mixer if present
      if (mixer) {
        mixer.update(deltaTime);
      }
      
      // Update camera based on current mode
      cameraController.update(deltaTime);
      
      // Update orbit controls (only active in viewer mode)
      controls.update();
      
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

function adjustCameraToModel(camera, controls, model) {
  const box = model.userData.boundingBox;
  const size = box.getSize(tempVector1);
  const center = box.getCenter(tempVector2);
  
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
  cameraDistance *= 1.8;

  camera.position.set(
    center.x + cameraDistance * 0.7,
    center.y + cameraDistance * 0.4,
    center.z + cameraDistance * 0.7
  );
  
  controls.target.set(center.x, center.y, center.z);
  controls.update();
  
  camera.near = cameraDistance * 0.01;
  camera.far = cameraDistance * 100;
  camera.updateProjectionMatrix();
}

function adjustGroundToModel(groundPlane, model) {
  if (!groundPlane || !model) return;
  
  const box = model.userData.boundingBox;
  const size = box.getSize(tempVector1);
  const center = box.getCenter(tempVector2);
  
  const groundSize = Math.max(size.x, size.z) * 4;
  groundPlane.scale.set(groundSize, groundSize, 1);
  groundPlane.position.set(center.x, box.min.y - 0.001, center.z);
}

init();
