import * as AFRAME from "aframe";

AFRAME.registerComponent("controller-attach", {
  schema: {
    hand: { type: "string", default: "right", oneOf: ["left", "right"] },
    offset: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    rotation: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    faceCamera: { type: "boolean", default: false }
  },

  init() {
    this.controllerEl = null;
    this.cameraEl = null;
    
    this.worldPosition = new THREE.Vector3();
    this.controllerPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    
    this.findController = this.findController.bind(this);
    this.findCamera = this.findCamera.bind(this);
    
    this.findController();
    this.findCamera();
    
    this.el.sceneEl.addEventListener("loaded", () => {
      this.findController();
      this.findCamera();
    });
    this.el.sceneEl.addEventListener("controllerconnected", this.findController);
  },

  findCamera() {
    this.cameraEl = document.querySelector("[camera]") || 
                    document.querySelector("a-camera") ||
                    document.querySelector("[camera]");
                    
    if (!this.cameraEl && this.el.sceneEl.camera) {
      this.cameraEl = this.el.sceneEl;
    }
    
    if (!this.cameraEl) {
      this.findCameraTimeout = setTimeout(() => this.findCamera(), 500);
    }
  },

  findController() {
    const controllerId = this.data.hand === "left" ? "leftHand" : "rightHand";
    this.controllerEl = document.getElementById(controllerId);
    
    if (!this.controllerEl) {
      this.findControllerTimeout = setTimeout(() => this.findController(), 500);
    }
  },

  tick() {
    if (!this.controllerEl || !this.controllerEl.isConnected) {
      return;
    }
    
    this.updatePosition();
    
    if (this.data.faceCamera) {
      this.updateFacingCamera();
    } else {
      this.updateRotation();
    }
  },

  updatePosition() {
    this.controllerEl.object3D.getWorldPosition(this.controllerPosition);
    
    const offsetVec = new THREE.Vector3(
      this.data.offset.x,
      this.data.offset.y,
      this.data.offset.z
    );
    
    const quaternion = new THREE.Quaternion();
    this.controllerEl.object3D.getWorldQuaternion(quaternion);
    offsetVec.applyQuaternion(quaternion);
    
    this.worldPosition.copy(this.controllerPosition).add(offsetVec);
    
    this.el.object3D.position.copy(this.worldPosition);
  },

  updateRotation() {
    const controllerRotation = new THREE.Euler();
    this.controllerEl.object3D.rotation.reorder('YXZ');
    controllerRotation.copy(this.controllerEl.object3D.rotation);
    
    controllerRotation.x += THREE.MathUtils.degToRad(this.data.rotation.x);
    controllerRotation.y += THREE.MathUtils.degToRad(this.data.rotation.y);
    controllerRotation.z += THREE.MathUtils.degToRad(this.data.rotation.z);
    
    this.el.object3D.rotation.copy(controllerRotation);
  },
  
  updateFacingCamera() {
    if (!this.cameraEl) {
      this.findCamera();
      return; 
    }

    if (this.cameraEl.object3D) {
      this.cameraEl.object3D.getWorldPosition(this.cameraPosition);
    } else if (this.cameraEl.camera && this.cameraEl.camera.parent) {
      this.cameraEl.camera.parent.getWorldPosition(this.cameraPosition);
    } else if (this.el.sceneEl.camera) {
      this.cameraPosition.set(0, 1.6, 0); 
      this.el.sceneEl.camera.getWorldPosition(this.cameraPosition);
    } else {
      return;
    }
    
    this.el.object3D.lookAt(this.cameraPosition);
    
    this.el.object3D.rotation.x += THREE.MathUtils.degToRad(this.data.rotation.x);
    this.el.object3D.rotation.y += THREE.MathUtils.degToRad(this.data.rotation.y);
    this.el.object3D.rotation.z += THREE.MathUtils.degToRad(this.data.rotation.z);
  },
  
  remove() {
    if (this.findControllerTimeout) {
      clearTimeout(this.findControllerTimeout);
    }
    
    if (this.findCameraTimeout) {
      clearTimeout(this.findCameraTimeout);
    }
    
    this.el.sceneEl.removeEventListener("loaded", this.findController);
    this.el.sceneEl.removeEventListener("controllerconnected", this.findController);
  }
});