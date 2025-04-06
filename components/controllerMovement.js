import * as AFRAME from "aframe";

AFRAME.registerComponent("controller-movement", {
  schema: {
    speed: { type: "number", default: 2 },
    rotationSpeed: { type: "number", default: 60 }, // Degrees per second
    mainHand: { type: "string", default: "left", oneOf: ["left", "right"] },
    mode: { type: "string", default: "controller", oneOf: ["head", "controller"] },
    smoothing: { type: "number", default: 0.1, min: 0, max: 1 },
    deadzone: { type: "number", default: 0.2, min: 0, max: 1 }
  },

  init() {
    this.cameraRigEl = null;
    this.cameraEl = null;
    this.movementVector = new THREE.Vector3();
    this.currentVelocity = new THREE.Vector3();
    this.targetVelocity = new THREE.Vector3();
    this.worldDirection = new THREE.Vector3();
    this.controllerDirection = new THREE.Vector3();
    this.isMoving = false;
    this.rotationAngle = 0;
    this.currentRotationVelocity = 0;
    this.targetRotationVelocity = 0;

    // Determine the off hand
    this.offHand = this.data.mainHand === "left" ? "right" : "left";

    // Setup controller references
    this.mainController = null;
    this.offController = null;
    this.controllersReady = false;

    this.findCameraRig = this.findCameraRig.bind(this);
    this.setupControllerListeners = this.setupControllerListeners.bind(this);
    this.onMainAxisMove = this.onMainAxisMove.bind(this);
    this.onOffAxisMove = this.onOffAxisMove.bind(this);
    this.onControllersReady = this.onControllersReady.bind(this);

    // Listen for 'controllers-ready' event that we'll emit from our tick function
    // once controllers are available
    this.el.addEventListener('controllers-ready', this.onControllersReady);

    if (this.el.sceneEl.hasLoaded) {
      this.findCameraRig();
    } else {
      this.el.sceneEl.addEventListener('loaded', this.findCameraRig);
    }
  },

  findCameraRig() {
    this.cameraRigEl = this.el.sceneEl.querySelector("#rig") || 
                       this.el.sceneEl.querySelector("[camera-rig]") || 
                       this.el.sceneEl.querySelector("a-camera").parentNode;

    this.cameraEl = this.el.sceneEl.querySelector("a-camera") || 
                    this.el.sceneEl.camera.el;
  },
  
  onControllersReady(evt) {
    console.log('Controllers are ready!', evt.detail);
    this.mainController = evt.detail.mainController;
    this.offController = evt.detail.offController;
    this.controllersReady = true;
    
    this.setupControllerListeners();
  },
  
  setupControllerListeners() {
    if (this.mainController) {
      console.log('Setting up main controller listeners');
      this.mainController.addEventListener('axismove', this.onMainAxisMove);
    } else {
      console.warn(`Main controller (${this.data.mainHand}) not available for movement.`);
    }

    if (this.offController) {
      console.log('Setting up off controller listeners');
      this.offController.addEventListener('axismove', this.onOffAxisMove);
    } else {
      console.warn(`Off controller (${this.offHand}) not available for rotation.`);
    }
  },

  onMainAxisMove(evt) {
    if (!this.cameraRigEl) return;

    const axisX = evt.detail.axis[2] || evt.detail.axis[0] || 0;
    const axisY = evt.detail.axis[3] || evt.detail.axis[1] || 0;

    // Apply deadzone
    const xMagnitude = Math.abs(axisX) < this.data.deadzone ? 0 : axisX;
    const yMagnitude = Math.abs(axisY) < this.data.deadzone ? 0 : axisY;

    if (xMagnitude === 0 && yMagnitude === 0) {
      this.isMoving = false;
      this.targetVelocity.set(0, 0, 0);
      return;
    }

    this.isMoving = true;

    // Handle movement
    const speed = this.data.speed;
    const moveX = xMagnitude * speed; // Strafing
    const moveZ = -yMagnitude * speed; // Forward/backward - INVERTED direction

    if (this.data.mode === "head") {
      // Get camera direction for head-based movement
      if (this.cameraEl && this.cameraEl.object3D) {
        // Use the actual camera object, not the scene's camera
        const cameraObj = this.cameraEl.object3D;
        const cameraWorldPos = new THREE.Vector3();
        const cameraWorldDir = new THREE.Vector3();
        
        // Get world position and direction of camera
        cameraObj.getWorldPosition(cameraWorldPos);
        cameraObj.getWorldDirection(cameraWorldDir);
        cameraWorldDir.multiplyScalar(-1); // Negate since A-Frame camera looks down -Z

        // Use the camera direction exactly for forward/backward
        // Project direction onto XZ plane for consistent movement
        cameraWorldDir.y = 0;
        cameraWorldDir.normalize();

        // Right vector is perpendicular to forward vector in XZ plane
        const rightVector = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          cameraWorldDir
        ).normalize();
        
        // Create movement vector directly in the direction we're looking
        const forwardMovement = cameraWorldDir.clone().multiplyScalar(moveZ);
        const rightMovement = rightVector.clone().multiplyScalar(moveX);
        
        // Combined movement
        this.targetVelocity.copy(forwardMovement).add(rightMovement);
      }
    } 
    else if (this.data.mode === "controller") {
      // Get controller direction for controller-based movement
      if (this.mainController && this.mainController.object3D) {
        this.mainController.object3D.getWorldDirection(this.controllerDirection);
        this.controllerDirection.multiplyScalar(-1); // Forward is -Z in A-Frame
        
        // Project onto XZ plane for consistent movement
        this.controllerDirection.y = 0;
        this.controllerDirection.normalize();
        
        // Right vector is perpendicular to controller direction
        const rightVector = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          this.controllerDirection
        ).normalize();
        
        // Create movement vector
        const forwardMovement = this.controllerDirection.clone().multiplyScalar(moveZ);
        const rightMovement = rightVector.clone().multiplyScalar(moveX);
        
        // Combined movement
        this.targetVelocity.copy(forwardMovement).add(rightMovement);
      }
    }
  },

  onOffAxisMove(evt) {
    if (!this.cameraRigEl) return;

    const axisX = evt.detail.axis[2] || evt.detail.axis[0] || 0;
    const axisY = evt.detail.axis[3] || evt.detail.axis[1] || 0;

    // Apply deadzone
    const xMagnitude = Math.abs(axisX) < this.data.deadzone ? 0 : axisX;

    if (xMagnitude === 0) {
      this.targetRotationVelocity = 0;
      return;
    }

    // Handle rotation
    this.targetRotationVelocity = -xMagnitude * this.data.rotationSpeed; // Negative for correct direction
  },

  tick(time, delta) {
    if (!this.cameraRigEl) return;
    
    // Check for controllers if not already connected
    if (!this.controllersReady) {
      const mainSelector = `#${this.data.mainHand}Hand`;
      const offSelector = `#${this.offHand}Hand`;
      
      const mainController = document.querySelector(mainSelector);
      const offController = document.querySelector(offSelector);
      
      // Only proceed if both controllers are found
      if (mainController && offController) {
        // Emit controllers-ready event with controller references
        this.el.emit('controllers-ready', {
          mainController: mainController,
          offController: offController
        });
      }
      
      // Continue with other operations even if controllers not ready
    }
    
    // Convert delta to seconds for consistent movement speed regardless of frame rate
    const dt = delta / 1000;
    
    // Interpolate current velocity toward target velocity (movement smoothing)
    const smoothing = Math.max(0.001, Math.min(1, this.data.smoothing));
    
    // If not moving, apply stronger damping for quicker stops
    const dampingFactor = this.isMoving ? smoothing : smoothing * 3;
    
    // Handle movement
    this.currentVelocity.lerp(this.targetVelocity, dampingFactor);
    
    // Apply movement if velocity is significant
    if (this.currentVelocity.lengthSq() > 0.00001) {
      // Scale by delta time for frame-rate independent movement
      const movement = this.currentVelocity.clone().multiplyScalar(dt);
      this.cameraRigEl.object3D.position.add(movement);
    }
    
    // Handle rotation
    this.currentRotationVelocity = this.currentRotationVelocity * (1 - dampingFactor) + 
                                  this.targetRotationVelocity * dampingFactor;
    
    // Apply rotation if significant
    if (Math.abs(this.currentRotationVelocity) > 0.01) {
      const rotationAmount = this.currentRotationVelocity * dt;
      this.cameraRigEl.object3D.rotation.y += THREE.MathUtils.degToRad(rotationAmount);
    }
  },

  remove() {
    if (this.mainController) {
      this.mainController.removeEventListener('axismove', this.onMainAxisMove);
    }

    if (this.offController) {
      this.offController.removeEventListener('axismove', this.onOffAxisMove);
    }

    this.el.removeEventListener('controllers-ready', this.onControllersReady);

    if (this.el.sceneEl) {
      this.el.sceneEl.removeEventListener('loaded', this.findCameraRig);
    }
  }
});