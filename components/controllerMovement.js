import * as AFRAME from "aframe";

AFRAME.registerComponent("controller-movement", {
  schema: {
    speed: { type: "number", default: 2 },
    rotationSpeed: { type: "number", default: 60 },
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

    this.offHand = this.data.mainHand === "left" ? "right" : "left";

    this.mainController = null;
    this.offController = null;
    this.controllersReady = false;

    this.findCameraRig = this.findCameraRig.bind(this);
    this.setupControllerListeners = this.setupControllerListeners.bind(this);
    this.onMainAxisMove = this.onMainAxisMove.bind(this);
    this.onOffAxisMove = this.onOffAxisMove.bind(this);
    this.onControllersReady = this.onControllersReady.bind(this);

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
    this.mainController = evt.detail.mainController;
    this.offController = evt.detail.offController;
    this.controllersReady = true;
    
    this.setupControllerListeners();
  },
  
  setupControllerListeners() {
    if (this.mainController) {
      this.mainController.addEventListener('axismove', this.onMainAxisMove);
    } else {
      console.warn(`Main controller (${this.data.mainHand}) not available for movement.`);
    }

    if (this.offController) {
      this.offController.addEventListener('axismove', this.onOffAxisMove);
    } else {
      console.warn(`Off controller (${this.offHand}) not available for rotation.`);
    }
  },

  onMainAxisMove(evt) {
    if (!this.cameraRigEl) return;

    const axisX = evt.detail.axis[2] || evt.detail.axis[0] || 0;
    const axisY = evt.detail.axis[3] || evt.detail.axis[1] || 0;

    const xMagnitude = Math.abs(axisX) < this.data.deadzone ? 0 : axisX;
    const yMagnitude = Math.abs(axisY) < this.data.deadzone ? 0 : axisY;

    if (xMagnitude === 0 && yMagnitude === 0) {
      this.isMoving = false;
      this.targetVelocity.set(0, 0, 0);
      return;
    }

    this.isMoving = true;

    const speed = this.data.speed;
    const moveX = -xMagnitude * speed;
    const moveZ = -yMagnitude * speed;

    if (this.data.mode === "head") {
      if (this.cameraEl && this.cameraEl.object3D) {
        const cameraObj = this.cameraEl.object3D;
        const cameraWorldPos = new THREE.Vector3();
        const cameraWorldDir = new THREE.Vector3();
        
        cameraObj.getWorldPosition(cameraWorldPos);
        cameraObj.getWorldDirection(cameraWorldDir);
        cameraWorldDir.multiplyScalar(-1); 

        cameraWorldDir.y = 0;
        cameraWorldDir.normalize();

        const rightVector = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          cameraWorldDir
        ).normalize();
        
        const forwardMovement = cameraWorldDir.clone().multiplyScalar(moveZ);
        const rightMovement = rightVector.clone().multiplyScalar(moveX);
        
        this.targetVelocity.copy(forwardMovement).add(rightMovement);
      }
    } 
    else if (this.data.mode === "controller") {
      if (this.mainController && this.mainController.object3D) {
        this.mainController.object3D.getWorldDirection(this.controllerDirection);
        this.controllerDirection.multiplyScalar(-1); 
        
        this.controllerDirection.y = 0;
        this.controllerDirection.normalize();
        
        const rightVector = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 1, 0),
          this.controllerDirection
        ).normalize();
        
        const forwardMovement = this.controllerDirection.clone().multiplyScalar(moveZ);
        const rightMovement = rightVector.clone().multiplyScalar(moveX);
        
        this.targetVelocity.copy(forwardMovement).add(rightMovement);
      }
    }
  },

  onOffAxisMove(evt) {
    if (!this.cameraRigEl) return;

    const axisX = evt.detail.axis[2] || evt.detail.axis[0] || 0;
    const axisY = evt.detail.axis[3] || evt.detail.axis[1] || 0;

    const xMagnitude = Math.abs(axisX) < this.data.deadzone ? 0 : axisX;

    if (xMagnitude === 0) {
      this.targetRotationVelocity = 0;
      return;
    }

    this.targetRotationVelocity = -xMagnitude * this.data.rotationSpeed;
  },

  tick(time, delta) {
    if (!this.cameraRigEl) return;
    
    if (!this.controllersReady) {
      const mainSelector = `#${this.data.mainHand}Hand`;
      const offSelector = `#${this.offHand}Hand`;
      
      const mainController = document.querySelector(mainSelector);
      const offController = document.querySelector(offSelector);
      
      if (mainController && offController) {
        this.el.emit('controllers-ready', {
          mainController: mainController,
          offController: offController
        });
      }
      
    }
    
    const dt = delta / 1000;
    
    const smoothing = Math.max(0.001, Math.min(1, this.data.smoothing));
    
    const dampingFactor = this.isMoving 
    ? smoothing 
    : Math.min(1, 1 - Math.pow(1 - smoothing, 0.5));
    
    this.currentVelocity.lerp(this.targetVelocity, dampingFactor);
    
    if (this.currentVelocity.lengthSq() > 0.00001) {
      const movement = this.currentVelocity.clone().multiplyScalar(dt);
      this.cameraRigEl.object3D.position.add(movement);
    }
    
    this.currentRotationVelocity = this.currentRotationVelocity * (1 - dampingFactor) + this.targetRotationVelocity * dampingFactor;
    
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