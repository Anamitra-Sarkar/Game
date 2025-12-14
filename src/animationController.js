import * as THREE from 'three';
import { SecondaryMotionController } from './secondaryMotion.js';

/**
 * Animation Controller
 * Manages animation states, transitions, and playback for a character model
 * Includes skeletal validation, procedural bone offsets, and secondary motion
 */

// Animation state enumeration
export const AnimationState = {
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run'
};

// Configuration constants
const CROSSFADE_DURATION = 0.25;  // Smooth transitions between animations
const WALK_SPEED_THRESHOLD = 0.1;  // Minimum speed to trigger walk
const RUN_SPEED_THRESHOLD = 4.0;   // Speed threshold for run animation

// Animation speed scaling
const MIN_WALK_SPEED_SCALE = 0.8;   // Minimum walk animation speed
const MAX_WALK_SPEED_SCALE = 1.3;   // Maximum walk animation speed
const WALK_SPEED_DIVISOR = 2.0;     // Divisor for walk speed calculation
const MAX_RUN_SPEED_SCALE = 1.5;    // Maximum run animation speed

// Procedural animation constants
const UPPER_BODY_INERTIA_FACTOR = 0.1;
const HEAD_LAG_FACTOR = 0.15;
const SHOULDER_LAG_FACTOR = 0.08;

export class AnimationController {
  constructor(model) {
    this.model = model;
    this.mixer = model.userData.mixer || null;
    this.clips = model.userData.clips || {};
    
    // Current animation state
    this.currentState = AnimationState.IDLE;
    this.currentAction = null;
    
    // Animation clips mapped to states
    this.animationClips = {
      idle: null,
      walk: null,
      run: null
    };
    
    // Skeletal structure
    this.skeleton = null;
    this.bones = {
      spine: null,
      chest: null,
      neck: null,
      head: null,
      leftShoulder: null,
      rightShoulder: null,
      hips: null
    };
    
    // Procedural animation state
    this.previousRotation = 0;
    this.rotationVelocity = 0;
    this.tempQuat1 = new THREE.Quaternion();
    this.tempQuat2 = new THREE.Quaternion();
    this.tempEuler = new THREE.Euler();
    
    // Secondary motion system
    this.secondaryMotion = new SecondaryMotionController(model);
    
    // Initialize animations
    this.validateSkeleton();
    this.setupAnimations();
  }
  
  /**
   * Validate skeletal structure and log bone hierarchy
   */
  validateSkeleton() {
    console.log('AnimationController: Validating skeleton...');
    
    // Find skeleton
    this.model.traverse((object) => {
      if (object.isSkinnedMesh && object.skeleton) {
        this.skeleton = object.skeleton;
      }
    });
    
    if (!this.skeleton) {
      console.warn('AnimationController: No skeleton found - model may be static or non-rigged');
      return;
    }
    
    console.log('AnimationController: Skeleton found with', this.skeleton.bones.length, 'bones');
    
    // Find key bones
    this.findKeyBones();
    
    // Log bone hierarchy
    this.logBoneHierarchy();
    
    // Validate bones
    this.validateBones();
  }
  
  /**
   * Find key bones for procedural animation
   */
  findKeyBones() {
    if (!this.skeleton) return;
    
    for (const bone of this.skeleton.bones) {
      const name = bone.name.toLowerCase();
      
      if (name.includes('spine') && !this.bones.spine) {
        this.bones.spine = bone;
      } else if ((name.includes('chest') || name.includes('upperchest')) && !this.bones.chest) {
        this.bones.chest = bone;
      } else if (name.includes('neck') && !this.bones.neck) {
        this.bones.neck = bone;
      } else if (name.includes('head') && !this.bones.head) {
        this.bones.head = bone;
      } else if ((name.includes('shoulder') || name.includes('clavicle')) && name.includes('left') && !this.bones.leftShoulder) {
        this.bones.leftShoulder = bone;
      } else if ((name.includes('shoulder') || name.includes('clavicle')) && name.includes('right') && !this.bones.rightShoulder) {
        this.bones.rightShoulder = bone;
      } else if ((name.includes('hips') || name.includes('pelvis')) && !this.bones.hips) {
        this.bones.hips = bone;
      }
    }
    
    console.log('AnimationController: Key bones found:', {
      spine: this.bones.spine?.name || 'none',
      chest: this.bones.chest?.name || 'none',
      neck: this.bones.neck?.name || 'none',
      head: this.bones.head?.name || 'none',
      leftShoulder: this.bones.leftShoulder?.name || 'none',
      rightShoulder: this.bones.rightShoulder?.name || 'none',
      hips: this.bones.hips?.name || 'none'
    });
  }
  
  /**
   * Log bone hierarchy for debugging
   */
  logBoneHierarchy() {
    if (!this.skeleton) return;
    
    console.log('AnimationController: Bone hierarchy:');
    const rootBones = this.skeleton.bones.filter(bone => !bone.parent || !bone.parent.isBone);
    
    const logBone = (bone, depth = 0) => {
      const indent = '  '.repeat(depth);
      const scale = bone.scale;
      const scaleStr = `(${scale.x.toFixed(2)}, ${scale.y.toFixed(2)}, ${scale.z.toFixed(2)})`;
      console.log(`${indent}├─ ${bone.name} ${scaleStr}`);
      
      // Log children that are bones
      const children = bone.children.filter(child => child.isBone);
      children.forEach(child => logBone(child, depth + 1));
    };
    
    rootBones.forEach(bone => logBone(bone));
  }
  
  /**
   * Validate bone properties
   */
  validateBones() {
    if (!this.skeleton) return;
    
    let hasIssues = false;
    
    for (const bone of this.skeleton.bones) {
      const issues = this.validateSingleBone(bone);
      if (issues.length > 0) {
        hasIssues = true;
        issues.forEach(issue => console.warn(issue));
      }
    }
    
    if (!hasIssues) {
      console.log('AnimationController: ✓ Skeleton validation passed - no issues found');
    } else {
      console.warn('AnimationController: ⚠ Skeleton validation found issues - check warnings above');
    }
  }
  
  /**
   * Validate a single bone and return array of issue messages
   */
  validateSingleBone(bone) {
    const issues = [];
    
    // Check for zero scale
    if (bone.scale.x === 0 || bone.scale.y === 0 || bone.scale.z === 0) {
      issues.push(`AnimationController: Bone "${bone.name}" has zero scale: (${bone.scale.x}, ${bone.scale.y}, ${bone.scale.z})`);
    }
    
    // Check for inverted scale
    if (bone.scale.x < 0 || bone.scale.y < 0 || bone.scale.z < 0) {
      issues.push(`AnimationController: Bone "${bone.name}" has inverted scale: (${bone.scale.x}, ${bone.scale.y}, ${bone.scale.z})`);
    }
    
    // Check for NaN values in position
    if (isNaN(bone.position.x) || isNaN(bone.position.y) || isNaN(bone.position.z)) {
      issues.push(`AnimationController: Bone "${bone.name}" has NaN position`);
    }
    
    // Check for NaN values in quaternion
    if (isNaN(bone.quaternion.x) || isNaN(bone.quaternion.y) || 
        isNaN(bone.quaternion.z) || isNaN(bone.quaternion.w)) {
      issues.push(`AnimationController: Bone "${bone.name}" has NaN quaternion`);
    }
    
    return issues;
  }
  
  /**
   * Find and register animation clips from the model
   */
  setupAnimations() {
    if (!this.mixer) {
      console.log('AnimationController: No mixer available - character will use static pose');
      return;
    }
    
    // Find animations by common naming patterns
    this.animationClips.idle = this.findAnimation(['idle', 'Idle', 'IDLE', 'standing', 'Standing', 'TPose', 'T-Pose']);
    this.animationClips.walk = this.findAnimation(['walk', 'Walk', 'WALK', 'walking', 'Walking']);
    this.animationClips.run = this.findAnimation(['run', 'Run', 'RUN', 'running', 'Running', 'sprint', 'Sprint']);
    
    // Log discovered animations
    console.log('AnimationController: Discovered animations:', {
      idle: this.animationClips.idle?.name || 'none',
      walk: this.animationClips.walk?.name || 'none',
      run: this.animationClips.run?.name || 'none'
    });
    
    // Start with idle animation if available
    if (this.animationClips.idle) {
      this.playAnimation(this.animationClips.idle, AnimationState.IDLE, 1.0);
    } else if (Object.keys(this.clips).length > 0) {
      // If no idle found, use first available animation as fallback
      const fallbackClip = Object.values(this.clips)[0];
      console.warn('AnimationController: No idle animation found, using fallback:', fallbackClip.name);
      this.playAnimation(fallbackClip, AnimationState.IDLE, 1.0);
    }
  }
  
  /**
   * Find an animation clip by searching through possible names
   */
  findAnimation(possibleNames) {
    for (const name of possibleNames) {
      // Direct match
      if (this.clips[name]) {
        return this.clips[name];
      }
      
      // Partial match (case-insensitive)
      for (const [clipName, clip] of Object.entries(this.clips)) {
        if (clipName.toLowerCase().includes(name.toLowerCase())) {
          return clip;
        }
      }
    }
    return null;
  }
  
  /**
   * Update animation based on character's movement speed
   */
  updateFromSpeed(speed, deltaTime) {
    if (!this.mixer) {
      // Even without mixer, update secondary motion if available
      if (this.secondaryMotion.hasSecondaryMotion()) {
        this.secondaryMotion.update(deltaTime);
      }
      return;
    }
    
    // Determine appropriate animation state based on speed
    let targetState = AnimationState.IDLE;
    let animationSpeed = 1.0;
    
    if (speed > WALK_SPEED_THRESHOLD) {
      if (speed > RUN_SPEED_THRESHOLD) {
        targetState = AnimationState.RUN;
        // Scale run animation speed with character speed
        animationSpeed = Math.min(MAX_RUN_SPEED_SCALE, speed / RUN_SPEED_THRESHOLD);
      } else {
        targetState = AnimationState.WALK;
        // Scale walk animation speed with character speed
        animationSpeed = Math.max(MIN_WALK_SPEED_SCALE, Math.min(MAX_WALK_SPEED_SCALE, speed / WALK_SPEED_DIVISOR));
      }
    }
    
    // Transition to new state if changed
    if (this.currentState !== targetState) {
      this.transitionToState(targetState, animationSpeed);
    } else if (this.currentAction) {
      // Update animation speed even if state hasn't changed
      this.currentAction.setEffectiveTimeScale(animationSpeed);
    }
    
    // Update mixer (advances all active animations)
    this.mixer.update(deltaTime);
    
    // Notify secondary motion that base animation has updated
    if (this.secondaryMotion.hasSecondaryMotion()) {
      this.secondaryMotion.onAnimationUpdate();
    }
    
    // Apply procedural bone offsets (after base animation)
    this.applyProceduralOffsets(speed, deltaTime);
    
    // Update secondary motion (after procedural offsets)
    if (this.secondaryMotion.hasSecondaryMotion()) {
      this.secondaryMotion.update(deltaTime);
    }
  }
  
  /**
   * Apply procedural bone offsets for added realism
   */
  applyProceduralOffsets(speed, deltaTime) {
    // Clamp deltaTime to prevent division issues
    if (!this.skeleton || deltaTime <= 0 || deltaTime > 0.1) return;
    
    // Calculate character rotation velocity
    const currentRotation = this.model.rotation.y;
    const rotationDelta = currentRotation - this.previousRotation;
    this.rotationVelocity = rotationDelta / deltaTime;
    this.previousRotation = currentRotation;
    
    // Apply upper body inertia (counter-rotation on turns)
    if (this.bones.spine && Math.abs(this.rotationVelocity) > 0.1) {
      const inertiaAmount = -this.rotationVelocity * UPPER_BODY_INERTIA_FACTOR * deltaTime;
      this.tempEuler.set(0, inertiaAmount, 0);
      this.tempQuat1.setFromEuler(this.tempEuler);
      this.bones.spine.quaternion.multiply(this.tempQuat1);
    }
    
    // Apply head lag (slight delay on turns)
    if (this.bones.head && Math.abs(this.rotationVelocity) > 0.1) {
      const headLag = -this.rotationVelocity * HEAD_LAG_FACTOR * deltaTime;
      this.tempEuler.set(0, headLag, 0);
      this.tempQuat1.setFromEuler(this.tempEuler);
      this.bones.head.quaternion.multiply(this.tempQuat1);
    }
    
    // Apply shoulder lag (subtle movement on direction changes)
    if (this.bones.leftShoulder && this.bones.rightShoulder && Math.abs(this.rotationVelocity) > 0.1) {
      const shoulderLag = this.rotationVelocity * SHOULDER_LAG_FACTOR * deltaTime;
      
      // Left shoulder
      this.tempEuler.set(0, 0, shoulderLag);
      this.tempQuat1.setFromEuler(this.tempEuler);
      this.bones.leftShoulder.quaternion.multiply(this.tempQuat1);
      
      // Right shoulder (opposite)
      this.tempEuler.set(0, 0, -shoulderLag);
      this.tempQuat1.setFromEuler(this.tempEuler);
      this.bones.rightShoulder.quaternion.multiply(this.tempQuat1);
    }
  }
  
  /**
   * Transition to a new animation state with smooth crossfade
   */
  transitionToState(newState, speed = 1.0) {
    let targetClip = null;
    
    // Select appropriate animation clip based on state
    switch (newState) {
      case AnimationState.IDLE:
        targetClip = this.animationClips.idle;
        break;
      case AnimationState.WALK:
        // Fallback chain: walk -> idle -> any animation
        targetClip = this.animationClips.walk || this.animationClips.idle;
        break;
      case AnimationState.RUN:
        // Fallback chain: run -> walk -> idle -> any animation
        targetClip = this.animationClips.run || this.animationClips.walk || this.animationClips.idle;
        break;
    }
    
    // If we found a clip, play it
    if (targetClip) {
      this.playAnimation(targetClip, newState, speed);
    } else {
      console.warn(`AnimationController: No animation available for state: ${newState}`);
    }
  }
  
  /**
   * Configure an animation action with standard settings
   */
  configureAction(action, speed = 1.0) {
    action.setLoop(THREE.LoopRepeat);
    action.clampWhenFinished = false;
    action.setEffectiveTimeScale(speed);
    return action;
  }
  
  /**
   * Play an animation with smooth crossfade from current animation
   */
  playAnimation(clip, state, speed = 1.0) {
    if (!this.mixer || !clip) return;
    
    const newAction = this.mixer.clipAction(clip);
    
    // Configure new action with standard settings
    this.configureAction(newAction, speed);
    
    // Smooth transition from current to new animation
    if (this.currentAction && this.currentAction !== newAction) {
      // Crossfade from old to new
      this.currentAction.fadeOut(CROSSFADE_DURATION);
      newAction.reset();
      newAction.fadeIn(CROSSFADE_DURATION);
      newAction.play();
    } else if (!this.currentAction) {
      // First animation - just play it
      newAction.reset();
      newAction.play();
    }
    
    // Update state
    this.currentAction = newAction;
    this.currentState = state;
  }
  
  /**
   * Get current animation state
   */
  getCurrentState() {
    return this.currentState;
  }
  
  /**
   * Check if animations are available
   */
  hasAnimations() {
    return this.mixer !== null && Object.keys(this.clips).length > 0;
  }
  
  /**
   * Manually set animation speed (useful for debugging)
   */
  setAnimationSpeed(speed) {
    if (this.currentAction) {
      this.currentAction.setEffectiveTimeScale(speed);
    }
  }
  
  /**
   * Get secondary motion controller
   */
  getSecondaryMotion() {
    return this.secondaryMotion;
  }
  
  /**
   * Get skeleton information
   */
  getSkeleton() {
    return this.skeleton;
  }
  
  /**
   * Get key bones
   */
  getKeyBones() {
    return this.bones;
  }
}
