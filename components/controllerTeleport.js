import * as AFRAME from "aframe";

AFRAME.registerComponent("controller-teleport", {
  schema: {
    hand: { type: "string", default: "right", oneOf: ["left", "right"] },
    button: { type: "string", default: "trigger", oneOf: ["trigger", "grip", "a", "b", "x", "y"] },
    cameraHeight: { type: "number", default: 1 },
    interactionClass: { type: "string", default: "interactive" }
  },
  
  init() {
    this.cameraRig = null;
    
    this.performTeleport = this.performTeleport.bind(this);
    
    if (this.el.sceneEl.hasLoaded) {
      this.setupTeleport();
    } else {
      this.el.sceneEl.addEventListener('loaded', this.setupTeleport.bind(this));
    }
  },
  
  setupTeleport() {
    this.cameraRig = document.querySelector("#rig");
    if (!this.cameraRig) {
      this.cameraRig = document.querySelector('[camera]').parentNode;
    }
    
    const controllerId = `${this.data.hand}Hand`;
    
    const buttonEvent = `${this.data.button}down`;
    const eventName = `${buttonEvent}`;
    
    this.el.sceneEl.addEventListener(eventName, (evt) => {
      if (evt.target && evt.target.id === controllerId) {
        this.performTeleport(evt.target);
      }
    });
    
    const controllerEl = document.getElementById(controllerId);
    if (controllerEl) {
      controllerEl.addEventListener(eventName, () => {
        this.performTeleport(controllerEl);
      });
    }
  },
  
  performTeleport(controller) {
    if (!this.cameraRig) return;
    
    const raycaster = controller.components.raycaster;
    if (!raycaster) {
      console.warn("No raycaster component found on controller", controller);
      return;
    }
    
    if (raycaster.intersections && raycaster.intersections.length > 0) {
      const validIntersections = raycaster.intersections.filter(intersection => {
        return intersection.object.el && intersection.object.el.classList.contains(this.data.interactionClass);
      });
      
      if (validIntersections.length === 0) {
        return;
      }
      
      const intersection = validIntersections[0];
      
      const point = intersection.point;
      
      const currentPosition = this.cameraRig.object3D.position;
      const newPosition = {
        x: point.x,
        y: point.y + this.data.cameraHeight,
        z: point.z
      };
      
      this.cameraRig.object3D.position.set(newPosition.x, newPosition.y, newPosition.z);
      
      this.el.emit('teleported', {
        from: currentPosition,
        to: newPosition,
        intersection: intersection
      });
    }
  },
  
  remove() {
    const buttonEvent = `${this.data.button}down`;
    this.el.sceneEl.removeEventListener(buttonEvent, this.performTeleport);
    
    const controllerId = `${this.data.hand}Hand`;
    const controllerEl = document.getElementById(controllerId);
    if (controllerEl) {
      controllerEl.removeEventListener(buttonEvent, this.performTeleport);
    }
  }
});