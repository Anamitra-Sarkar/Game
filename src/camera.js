import * as THREE from 'three';

/**
 * Camera system supporting two modes:
 * - Viewer Mode: OrbitControls for inspection
 * - Game Mode: Third-person follow camera (prepared for future activation)
 */

const GAME_CAMERA_OFFSET = new THREE.Vector3(0, 2, 5);  // Behind and above character
const GAME_CAMERA_LOOK_AHEAD = 2;                        // How far ahead to look
const CAMERA_LERP_FACTOR = 0.1;                          // Smooth follow speed

export const CameraMode = {
  VIEWER: 'viewer',
  GAME: 'game'
};

export class CameraController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this.mode = CameraMode.VIEWER;
    this.target = null;
    
    // Game mode camera state
    this.desiredPosition = new THREE.Vector3();
    this.desiredLookAt = new THREE.Vector3();
    
    // Temp vectors for calculations
    this.tempVector1 = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
  }
  
  /**
   * Set the target object for game mode camera to follow
   */
  setTarget(target) {
    this.target = target;
  }
  
  /**
   * Switch between camera modes
   */
  setMode(mode) {
    if (this.mode === mode) return;
    
    this.mode = mode;
    
    if (mode === CameraMode.VIEWER) {
      this.controls.enabled = true;
    } else if (mode === CameraMode.GAME) {
      this.controls.enabled = false;
    }
  }
  
  /**
   * Update camera based on current mode
   * Call this in the animation loop
   */
  update(deltaTime) {
    if (this.mode === CameraMode.VIEWER) {
      // OrbitControls handles this
      return;
    }
    
    if (this.mode === CameraMode.GAME && this.target) {
      this.updateGameCamera(deltaTime);
    }
  }
  
  /**
   * Third-person camera logic (prepared for future game mode)
   */
  updateGameCamera(deltaTime) {
    if (!this.target) return;
    
    // Get target position and rotation
    const targetPosition = this.target.getWorldPosition(this.tempVector1);
    const targetRotation = this.target.rotation;
    
    // Calculate desired camera position (behind and above)
    this.desiredPosition.copy(GAME_CAMERA_OFFSET);
    this.desiredPosition.applyEuler(targetRotation);
    this.desiredPosition.add(targetPosition);
    
    // Calculate look-at point (slightly ahead of character)
    this.desiredLookAt.copy(targetPosition);
    this.tempVector2.set(0, 0, -GAME_CAMERA_LOOK_AHEAD);
    this.tempVector2.applyEuler(targetRotation);
    this.desiredLookAt.add(this.tempVector2);
    
    // Smoothly interpolate to desired position
    this.camera.position.lerp(this.desiredPosition, CAMERA_LERP_FACTOR);
    
    // Look at the target
    this.camera.lookAt(this.desiredLookAt);
  }
}
