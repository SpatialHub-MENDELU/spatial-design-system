import * as AFRAME from "aframe";

AFRAME.registerComponent("controller-movement", {
  schema: {
    speed: { type: "number", default: 1 },
    hand: { type: "string", default: "left", oneOf: ["left", "right"] }
  },

  init() {
    this.cameraRigEl = null;
    this.movementVector = new THREE.Vector3();
    this.worldDirection = new THREE.Vector3();

    this.findCameraRig = this.findCameraRig.bind(this);
    this.onAxisMove = this.onAxisMove.bind(this);

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

    if (this.cameraRigEl) {
      this.el.setAttribute('tracked-controls', {
        hand: this.data.hand
      });

      this.el.addEventListener('axismove', this.onAxisMove);
    }
  },

  onAxisMove(evt) {
    if (!this.cameraRigEl) return;

    const axisX = evt.detail.axis[2] || evt.detail.axis[0] || 0;
    const axisY = evt.detail.axis[3] || evt.detail.axis[1] || 0;

    const deadzone = 0.2;
    if (Math.abs(axisX) < deadzone && Math.abs(axisY) < deadzone) {
      return;
    }

    const camera = this.el.sceneEl.camera;
    camera.getWorldDirection(this.worldDirection);

    const moveX = axisX * this.data.speed/10;
    const moveZ = axisY * this.data.speed/10;

    this.movementVector.set(moveX, 0, moveZ);
    this.movementVector.applyQuaternion(camera.quaternion);

    this.cameraRigEl.object3D.position.add(this.movementVector);
  },

  remove() {
    if (this.el) {
      this.el.removeEventListener('axismove', this.onAxisMove);
    }

    if (this.el.sceneEl) {
      this.el.sceneEl.removeEventListener('loaded', this.findCameraRig);
    }
  }
});