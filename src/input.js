/**
 * Input System
 * Handles keyboard and mouse input for character control
 */

export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    
    // Keyboard state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false
    };
    
    // Mouse state
    this.mouse = {
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: 0,
      isLocked: false
    };
    
    // Bind event handlers
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onClick = this.onClick.bind(this);
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('click', this.onClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
  }
  
  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
    }
  }
  
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
    }
  }
  
  onClick() {
    // Request pointer lock for mouse camera control
    if (!this.mouse.isLocked) {
      this.domElement.requestPointerLock();
    }
  }
  
  onPointerLockChange() {
    this.mouse.isLocked = document.pointerLockElement === this.domElement;
  }
  
  onMouseMove(event) {
    if (this.mouse.isLocked) {
      this.mouse.deltaX = event.movementX || 0;
      this.mouse.deltaY = event.movementY || 0;
    } else {
      this.mouse.deltaX = 0;
      this.mouse.deltaY = 0;
    }
  }
  
  /**
   * Get movement input as normalized direction vector
   */
  getMovementInput() {
    const input = {
      x: 0,
      z: 0
    };
    
    if (this.keys.forward) input.z -= 1;
    if (this.keys.backward) input.z += 1;
    if (this.keys.left) input.x -= 1;
    if (this.keys.right) input.x += 1;
    
    // Normalize diagonal movement
    const length = Math.sqrt(input.x * input.x + input.z * input.z);
    if (length > 0) {
      input.x /= length;
      input.z /= length;
    }
    
    return input;
  }
  
  /**
   * Check if character should sprint
   */
  isSprinting() {
    return this.keys.sprint;
  }
  
  /**
   * Get mouse delta and reset for next frame
   */
  getMouseDelta() {
    const delta = {
      x: this.mouse.deltaX,
      y: this.mouse.deltaY
    };
    
    // Reset deltas after reading
    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    
    return delta;
  }
  
  /**
   * Check if any movement key is pressed
   */
  isMoving() {
    return this.keys.forward || this.keys.backward || 
           this.keys.left || this.keys.right;
  }
  
  /**
   * Clean up event listeners
   */
  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('click', this.onClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}
