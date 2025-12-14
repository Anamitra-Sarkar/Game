import * as THREE from 'three';
import { AnimationController } from './animationController.js';

/**
 * Character Controller
 * Handles character movement and rotation with polished feel
 * Delegates animation to AnimationController
 */

const WALK_SPEED = 2.0;
const RUN_SPEED = 5.0;
const ROTATION_SPEED = 10.0;
const ROTATION_SMOOTHING = 0.15;  // Smoothing factor for rotation (lower = smoother)
const MOVEMENT_ACCELERATION = 8.0;  // Speed of acceleration
const MOVEMENT_DECELERATION = 12.0; // Speed of deceleration (faster stop)

export class CharacterController {
  constructor(model, camera) {
    this.model = model;
    this.camera = camera;
    
    // Movement state
    this.velocity = new THREE.Vector3();
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    
    // Rotation state
    this.currentRotation = this.model.rotation.y;
    this.targetRotation = this.model.rotation.y;
    
    // Animation controller (separate concern)
    this.animationController = new AnimationController(model);
    
    // Temp vectors for calculations
    this.tempVector1 = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
  }
  
  update(deltaTime, inputManager) {
    // Get movement input
    const input = inputManager.getMovementInput();
    const isSprinting = inputManager.isSprinting();
    const isMoving = Math.abs(input.x) > 0.01 || Math.abs(input.z) > 0.01;
    
    if (isMoving) {
      // Calculate movement direction relative to camera
      const cameraDirection = this.camera.getWorldDirection(this.tempVector1);
      cameraDirection.y = 0;
      cameraDirection.normalize();
      
      const cameraRight = this.tempVector2.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
      
      // Calculate movement vector
      const moveDirection = new THREE.Vector3();
      moveDirection.addScaledVector(cameraRight, input.x);
      moveDirection.addScaledVector(cameraDirection, -input.z);
      moveDirection.normalize();
      
      // Determine target speed with smooth acceleration
      this.targetSpeed = isSprinting ? RUN_SPEED : WALK_SPEED;
      
      // Smooth acceleration (ease-in)
      const acceleration = MOVEMENT_ACCELERATION * deltaTime;
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, this.targetSpeed, acceleration);
      
      // Move character
      this.velocity.copy(moveDirection).multiplyScalar(this.currentSpeed * deltaTime);
      this.model.position.add(this.velocity);
      
      // Calculate target rotation
      this.targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      
      // Smooth rotation using angular interpolation
      const rotationDelta = this.shortestAngle(this.currentRotation, this.targetRotation);
      const rotationSpeed = ROTATION_SPEED * deltaTime;
      
      // Apply rotation smoothing
      const smoothedRotation = rotationDelta * ROTATION_SMOOTHING;
      const clampedRotation = THREE.MathUtils.clamp(smoothedRotation, -rotationSpeed, rotationSpeed);
      
      this.currentRotation += clampedRotation;
      this.model.rotation.y = this.currentRotation;
    } else {
      // Smooth deceleration (ease-out)
      this.targetSpeed = 0;
      const deceleration = MOVEMENT_DECELERATION * deltaTime;
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, this.targetSpeed, deceleration);
      
      // Clamp to zero when very small to avoid jitter
      if (this.currentSpeed < 0.01) {
        this.currentSpeed = 0;
      }
    }
    
    // Update animation based on speed (delegated to AnimationController)
    this.animationController.updateFromSpeed(this.currentSpeed, deltaTime);
  }
  
  /**
   * Calculate shortest angle between two angles using efficient modulo
   */
  shortestAngle(current, target) {
    let delta = target - current;
    // Normalize to -PI to PI range using modulo
    delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI;
    return delta;
  }
  
  getPosition() {
    return this.model.position.clone();
  }
  
  getRotation() {
    return this.model.rotation.clone();
  }
}
