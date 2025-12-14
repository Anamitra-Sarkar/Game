import * as THREE from 'three';

/**
 * Third-Person Game Camera
 * Smooth follow camera with mouse rotation around character
 */

const CAMERA_OFFSET_DISTANCE = 5.0;
const CAMERA_HEIGHT = 2.5;
const CAMERA_LOOK_AT_HEIGHT = 1.5;
const CAMERA_LERP_FACTOR = 5.0;
const MOUSE_SENSITIVITY = 0.002;
const MIN_POLAR_ANGLE = 0.1;
const MAX_POLAR_ANGLE = Math.PI / 2 - 0.1;
const MIN_CAMERA_HEIGHT = 0.5;

export class GameCamera {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    
    // Camera orbit angles
    this.azimuthAngle = 0;    // Horizontal rotation (around Y axis)
    this.polarAngle = Math.PI / 4;  // Vertical angle (0 = top, PI = bottom)
    
    // Camera position state
    this.currentPosition = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.lookAtPoint = new THREE.Vector3();
    
    // Temp vectors
    this.tempVector1 = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    
    // Initialize camera position
    this.updateCameraPosition();
    this.currentPosition.copy(this.desiredPosition);
    this.camera.position.copy(this.currentPosition);
  }
  
  /**
   * Update camera based on mouse input and target position
   */
  update(deltaTime, inputManager) {
    // Get mouse delta for camera rotation
    const mouseDelta = inputManager.getMouseDelta();
    
    // Update camera angles based on mouse movement
    this.azimuthAngle -= mouseDelta.x * MOUSE_SENSITIVITY;
    this.polarAngle += mouseDelta.y * MOUSE_SENSITIVITY;
    
    // Clamp polar angle to prevent camera flipping
    this.polarAngle = Math.max(MIN_POLAR_ANGLE, Math.min(MAX_POLAR_ANGLE, this.polarAngle));
    
    // Calculate desired camera position
    this.updateCameraPosition();
    
    // Smoothly interpolate to desired position
    const lerpFactor = Math.min(1.0, CAMERA_LERP_FACTOR * deltaTime);
    this.currentPosition.lerp(this.desiredPosition, lerpFactor);
    
    // Apply position to camera
    this.camera.position.copy(this.currentPosition);
    
    // Look at point on character
    this.lookAtPoint.copy(this.target.position);
    this.lookAtPoint.y += CAMERA_LOOK_AT_HEIGHT;
    this.camera.lookAt(this.lookAtPoint);
  }
  
  updateCameraPosition() {
    // Calculate spherical coordinates
    const sinPolar = Math.sin(this.polarAngle);
    const cosPolar = Math.cos(this.polarAngle);
    const sinAzimuth = Math.sin(this.azimuthAngle);
    const cosAzimuth = Math.cos(this.azimuthAngle);
    
    // Calculate offset from target
    const offsetX = CAMERA_OFFSET_DISTANCE * sinPolar * sinAzimuth;
    const offsetY = CAMERA_OFFSET_DISTANCE * cosPolar + CAMERA_HEIGHT;
    const offsetZ = CAMERA_OFFSET_DISTANCE * sinPolar * cosAzimuth;
    
    // Set desired position relative to target
    this.desiredPosition.set(
      this.target.position.x + offsetX,
      Math.max(this.target.position.y + offsetY, MIN_CAMERA_HEIGHT),
      this.target.position.z + offsetZ
    );
  }
  
  /**
   * Set new target for camera to follow
   */
  setTarget(target) {
    this.target = target;
    this.updateCameraPosition();
    this.currentPosition.copy(this.desiredPosition);
  }
  
  /**
   * Get camera's forward direction (useful for movement calculations)
   */
  getForwardDirection() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    return direction;
  }
  
  /**
   * Get camera's right direction
   */
  getRightDirection() {
    const forward = this.getForwardDirection();
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    return right;
  }
}
