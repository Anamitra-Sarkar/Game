import * as THREE from 'three';

/**
 * Secondary Motion System
 * Provides physics-based secondary motion for hair, cloth, and body parts
 * Uses spring-dampening math without a full physics engine
 */

// Configuration constants
const SPRING_STIFFNESS = 15.0;
const SPRING_DAMPING = 0.8;
const MAX_DISPLACEMENT = 0.3;  // Clamp to avoid instability
const MAX_DELTA_TIME = 0.1;    // Maximum deltaTime to prevent physics instability
const VELOCITY_SCALE = 0.5;
const ACCELERATION_SCALE = 0.3;

// Bone detection keywords (module-level to avoid recreation)
const HAIR_KEYWORDS = ['hair', 'ponytail', 'braid', 'strand'];
const CLOTH_KEYWORDS = ['cloth', 'cape', 'skirt', 'scarf', 'ribbon', 'tie'];
const UPPER_BODY_KEYWORDS = ['spine', 'chest', 'upperchest', 'neck'];

// Secondary motion types
export const SecondaryMotionType = {
  HAIR: 'hair',
  CLOTH: 'cloth',
  UPPER_BODY: 'upperBody'
};

/**
 * Spring-Damper physics for a single bone
 */
class BoneSpring {
  constructor(bone, type, config = {}) {
    this.bone = bone;
    this.type = type;
    
    // Spring-damper parameters
    this.stiffness = config.stiffness || SPRING_STIFFNESS;
    this.damping = config.damping || SPRING_DAMPING;
    this.maxDisplacement = config.maxDisplacement || MAX_DISPLACEMENT;
    
    // Current state
    this.velocity = new THREE.Vector3();
    this.displacement = new THREE.Vector3();
    
    // Original transform (for resetting)
    this.originalRotation = new THREE.Quaternion();
    if (this.bone.quaternion) {
      this.originalRotation.copy(this.bone.quaternion);
    }
    
    // Temp vectors
    this.tempVector = new THREE.Vector3();
    this.tempQuat = new THREE.Quaternion();
  }
  
  /**
   * Update spring physics based on character motion
   */
  update(deltaTime, characterVelocity, characterAcceleration) {
    // Clamp deltaTime to prevent physics instability
    if (deltaTime <= 0 || deltaTime > MAX_DELTA_TIME) {
      deltaTime = 0.016; // Fallback to ~60fps
    }
    
    // Calculate driving force from character motion
    const force = this.tempVector.set(0, 0, 0);
    
    // Velocity contribution (direction lag)
    if (characterVelocity) {
      force.addScaledVector(characterVelocity, -VELOCITY_SCALE);
    }
    
    // Acceleration contribution (inertia)
    if (characterAcceleration) {
      force.addScaledVector(characterAcceleration, -ACCELERATION_SCALE);
    }
    
    // Spring-damper physics
    // F = -kx - cv
    const springForce = this.displacement.clone().multiplyScalar(-this.stiffness);
    const dampingForce = this.velocity.clone().multiplyScalar(-this.damping);
    
    force.add(springForce).add(dampingForce);
    
    // Update velocity: v = v + a*dt (where a = F, assuming unit mass)
    this.velocity.addScaledVector(force, deltaTime);
    
    // Update displacement: x = x + v*dt
    this.displacement.addScaledVector(this.velocity, deltaTime);
    
    // Clamp displacement to prevent instability
    const displacementMagnitude = this.displacement.length();
    if (displacementMagnitude > this.maxDisplacement) {
      this.displacement.normalize().multiplyScalar(this.maxDisplacement);
      // Also dampen velocity when clamped
      this.velocity.multiplyScalar(0.5);
    }
    
    // Apply displacement to bone rotation
    this.applyDisplacement();
  }
  
  /**
   * Apply displacement as rotation offset
   */
  applyDisplacement() {
    if (!this.bone.quaternion) return;
    
    // Create rotation from displacement
    const angle = this.displacement.length();
    if (angle > 0.001) {
      const axis = this.displacement.clone().normalize();
      this.tempQuat.setFromAxisAngle(axis, angle);
      
      // Apply as additive rotation (multiply with original)
      this.bone.quaternion.copy(this.originalRotation);
      this.bone.quaternion.multiply(this.tempQuat);
    } else {
      // No displacement, return to original
      this.bone.quaternion.copy(this.originalRotation);
    }
  }
  
  /**
   * Reset to rest state
   */
  reset() {
    this.velocity.set(0, 0, 0);
    this.displacement.set(0, 0, 0);
    if (this.bone.quaternion) {
      this.bone.quaternion.copy(this.originalRotation);
    }
  }
  
  /**
   * Update original rotation (called when base animation changes)
   */
  updateOriginalRotation() {
    if (this.bone.quaternion) {
      this.originalRotation.copy(this.bone.quaternion);
    }
  }
}

/**
 * Secondary Motion Controller
 * Manages secondary motion for all affected bones
 */
export class SecondaryMotionController {
  constructor(model) {
    this.model = model;
    this.springs = [];
    
    // Character motion state
    this.previousPosition = new THREE.Vector3();
    this.currentVelocity = new THREE.Vector3();
    this.currentAcceleration = new THREE.Vector3();
    this.previousVelocity = new THREE.Vector3();
    
    // Temp vectors
    this.tempVector1 = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    
    // Initialize
    this.discoverAndSetupBones();
  }
  
  /**
   * Discover bones that should have secondary motion
   */
  discoverAndSetupBones() {
    const hairBones = [];
    const clothBones = [];
    const upperBodyBones = [];
    
    this.model.traverse((object) => {
      if (object.isBone) {
        const name = object.name.toLowerCase();
        
        // Detect hair bones
        if (HAIR_KEYWORDS.some(keyword => name.includes(keyword))) {
          hairBones.push(object);
        }
        // Detect cloth/accessory bones
        else if (CLOTH_KEYWORDS.some(keyword => name.includes(keyword))) {
          clothBones.push(object);
        }
        // Detect upper body bones for soft motion
        else if (UPPER_BODY_KEYWORDS.some(keyword => name.includes(keyword))) {
          upperBodyBones.push(object);
        }
      }
    });
    
    // Create springs for discovered bones
    hairBones.forEach(bone => {
      this.springs.push(new BoneSpring(bone, SecondaryMotionType.HAIR, {
        stiffness: 12.0,
        damping: 0.7,
        maxDisplacement: 0.4
      }));
    });
    
    clothBones.forEach(bone => {
      this.springs.push(new BoneSpring(bone, SecondaryMotionType.CLOTH, {
        stiffness: 10.0,
        damping: 0.6,
        maxDisplacement: 0.5
      }));
    });
    
    upperBodyBones.forEach(bone => {
      this.springs.push(new BoneSpring(bone, SecondaryMotionType.UPPER_BODY, {
        stiffness: 20.0,
        damping: 0.9,
        maxDisplacement: 0.15
      }));
    });
    
    console.log('SecondaryMotion: Initialized springs:', {
      hair: hairBones.length,
      cloth: clothBones.length,
      upperBody: upperBodyBones.length,
      total: this.springs.length
    });
    
    // Store bone names for debugging
    if (hairBones.length > 0) {
      console.log('SecondaryMotion: Hair bones:', hairBones.map(b => b.name));
    }
    if (clothBones.length > 0) {
      console.log('SecondaryMotion: Cloth bones:', clothBones.map(b => b.name));
    }
  }
  
  /**
   * Update all secondary motion
   */
  update(deltaTime) {
    if (this.springs.length === 0) return;
    
    // Calculate character velocity and acceleration
    this.updateCharacterMotion(deltaTime);
    
    // Update all springs
    for (const spring of this.springs) {
      spring.update(deltaTime, this.currentVelocity, this.currentAcceleration);
    }
  }
  
  /**
   * Calculate character velocity and acceleration from position
   */
  updateCharacterMotion(deltaTime) {
    // Clamp deltaTime to prevent physics instability
    if (deltaTime <= 0 || deltaTime > MAX_DELTA_TIME) {
      deltaTime = 0.016; // Fallback to ~60fps
    }
    
    // Calculate velocity: v = (x - x_prev) / dt
    this.tempVector1.copy(this.model.position);
    this.currentVelocity.subVectors(this.tempVector1, this.previousPosition)
                        .divideScalar(deltaTime);
    
    // Calculate acceleration: a = (v - v_prev) / dt
    this.currentAcceleration.subVectors(this.currentVelocity, this.previousVelocity)
                            .divideScalar(deltaTime);
    
    // Store for next frame
    this.previousPosition.copy(this.tempVector1);
    this.previousVelocity.copy(this.currentVelocity);
  }
  
  /**
   * Notify when base animation changes (update original rotations)
   */
  onAnimationUpdate() {
    for (const spring of this.springs) {
      spring.updateOriginalRotation();
    }
  }
  
  /**
   * Reset all secondary motion to rest state
   */
  reset() {
    for (const spring of this.springs) {
      spring.reset();
    }
    this.previousPosition.copy(this.model.position);
    this.currentVelocity.set(0, 0, 0);
    this.currentAcceleration.set(0, 0, 0);
    this.previousVelocity.set(0, 0, 0);
  }
  
  /**
   * Check if any secondary motion is active
   */
  hasSecondaryMotion() {
    return this.springs.length > 0;
  }
  
  /**
   * Get statistics for debugging
   */
  getStats() {
    return {
      totalSprings: this.springs.length,
      velocity: this.currentVelocity.length(),
      acceleration: this.currentAcceleration.length()
    };
  }
}
