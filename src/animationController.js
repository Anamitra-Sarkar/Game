import * as THREE from 'three';

/**
 * Animation Controller
 * Manages animation states, transitions, and playback for a character model
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
    
    // Initialize animations
    this.setupAnimations();
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
    if (!this.mixer) return;
    
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
}
