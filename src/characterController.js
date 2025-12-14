import * as THREE from 'three';

/**
 * Character Controller
 * Handles character movement, rotation, and animation states
 */

const WALK_SPEED = 2.0;
const RUN_SPEED = 5.0;
const ROTATION_SPEED = 10.0;

const AnimationState = {
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run'
};

export class CharacterController {
  constructor(model, camera) {
    this.model = model;
    this.camera = camera;
    
    // Movement state
    this.velocity = new THREE.Vector3();
    this.currentSpeed = 0;
    
    // Animation state
    this.currentState = AnimationState.IDLE;
    this.mixer = model.userData.mixer || null;
    this.animations = model.userData.clips || {};
    this.currentAction = null;
    
    // Temp vectors for calculations
    this.tempVector1 = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
    
    // Setup initial animation state
    this.setupAnimations();
  }
  
  setupAnimations() {
    if (!this.mixer) {
      console.log('No animations available - using static pose');
      return;
    }
    
    // Find animations by common naming patterns
    this.animationClips = {
      idle: this.findAnimation(['idle', 'Idle', 'IDLE', 'standing', 'Standing']),
      walk: this.findAnimation(['walk', 'Walk', 'WALK', 'walking', 'Walking']),
      run: this.findAnimation(['run', 'Run', 'RUN', 'running', 'Running', 'sprint', 'Sprint'])
    };
    
    console.log('Animation clips found:', {
      idle: this.animationClips.idle?.name || 'none',
      walk: this.animationClips.walk?.name || 'none',
      run: this.animationClips.run?.name || 'none'
    });
    
    // Start with idle animation if available
    if (this.animationClips.idle) {
      this.playAnimation(this.animationClips.idle, AnimationState.IDLE);
    }
  }
  
  findAnimation(names) {
    for (const name of names) {
      const clip = this.animations[name];
      if (clip) return clip;
      
      // Check if any animation name contains this string
      for (const [clipName, clip] of Object.entries(this.animations)) {
        if (clipName.toLowerCase().includes(name.toLowerCase())) {
          return clip;
        }
      }
    }
    return null;
  }
  
  playAnimation(clip, state) {
    if (!this.mixer || !clip) return;
    
    const newAction = this.mixer.clipAction(clip);
    
    if (this.currentAction && this.currentAction !== newAction) {
      // Smooth transition between animations
      this.currentAction.fadeOut(0.2);
      newAction.reset().fadeIn(0.2).play();
    } else if (!this.currentAction) {
      newAction.play();
    }
    
    this.currentAction = newAction;
    this.currentState = state;
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
      
      // Determine speed
      const targetSpeed = isSprinting ? RUN_SPEED : WALK_SPEED;
      this.currentSpeed = targetSpeed;
      
      // Move character
      this.velocity.copy(moveDirection).multiplyScalar(this.currentSpeed * deltaTime);
      this.model.position.add(this.velocity);
      
      // Rotate character to face movement direction
      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      const currentRotation = this.model.rotation.y;
      const rotationDelta = this.shortestAngle(currentRotation, targetRotation);
      
      this.model.rotation.y += rotationDelta * ROTATION_SPEED * deltaTime;
      
      // Update animation state
      const newState = isSprinting ? AnimationState.RUN : AnimationState.WALK;
      if (this.currentState !== newState) {
        this.transitionToState(newState);
      }
    } else {
      this.currentSpeed = 0;
      
      // Transition to idle
      if (this.currentState !== AnimationState.IDLE) {
        this.transitionToState(AnimationState.IDLE);
      }
    }
    
    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }
  
  transitionToState(newState) {
    let clip = null;
    
    switch (newState) {
      case AnimationState.IDLE:
        clip = this.animationClips.idle;
        break;
      case AnimationState.WALK:
        clip = this.animationClips.walk || this.animationClips.idle;
        break;
      case AnimationState.RUN:
        clip = this.animationClips.run || this.animationClips.walk || this.animationClips.idle;
        break;
    }
    
    if (clip) {
      this.playAnimation(clip, newState);
    }
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
