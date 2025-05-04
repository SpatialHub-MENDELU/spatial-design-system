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
    this.cameraEl = null; // Initialize as null
    
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

  // New method to find camera
  findCamera() {
    // Try different selectors to find the camera
    this.cameraEl = document.querySelector("[camera]") || 
                    document.querySelector("a-camera") ||
                    document.querySelector("[camera]");
                    
    if (!this.cameraEl && this.el.sceneEl.camera) {
      // If camera element not found but scene has camera object, create a reference
      this.cameraEl = this.el.sceneEl;
    }
    
    if (!this.cameraEl) {
      // If still not found, try again later
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
    
    // Use different rotation logic based on faceCamera flag
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
    // Check if camera element exists before using it
    if (!this.cameraEl) {
      this.findCamera(); // Try to find camera again
      return; // Skip this frame if camera not found
    }

    // Get camera position - handle both direct camera elements and scene.camera cases
    if (this.cameraEl.object3D) {
      this.cameraEl.object3D.getWorldPosition(this.cameraPosition);
    } else if (this.cameraEl.camera && this.cameraEl.camera.parent) {
      this.cameraEl.camera.parent.getWorldPosition(this.cameraPosition);
    } else if (this.el.sceneEl.camera) {
      // Last resort: try to use scene's camera directly
      this.cameraPosition.set(0, 1.6, 0); // Default camera height
      this.el.sceneEl.camera.getWorldPosition(this.cameraPosition);
    } else {
      // If still no camera, return without updating rotation
      return;
    }
    
    // Make the object look at the camera
    this.el.object3D.lookAt(this.cameraPosition);
    
    // Apply additional rotation offset after facing the camera
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