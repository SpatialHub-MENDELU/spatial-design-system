import * as AFRAME from "aframe";

AFRAME.registerComponent("controller-attach", {
  schema: {
    hand: { type: "string", default: "right", oneOf: ["left", "right"] },
    offset: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    rotation: { type: "vec3", default: { x: 0, y: 0, z: 0 } }
  },

  init() {
    this.controllerEl = null;
    this.cameraEl = document.querySelector("[camera]");
    
    this.worldPosition = new THREE.Vector3();
    this.controllerPosition = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    
    this.findController = this.findController.bind(this);
    
    this.findController();
    
    this.el.sceneEl.addEventListener("loaded", this.findController);
    this.el.sceneEl.addEventListener("controllerconnected", this.findController);
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
    this.updateRotation();
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
  
  remove() {
    if (this.findControllerTimeout) {
      clearTimeout(this.findControllerTimeout);
    }
    
    this.el.sceneEl.removeEventListener("loaded", this.findController);
    this.el.sceneEl.removeEventListener("controllerconnected", this.findController);
  }
});