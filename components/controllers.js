import * as AFRAME from "aframe";
import "../components/position.js";

AFRAME.registerComponent("controllers", {
  schema: {
    leftEnabled: { type: "boolean", default: true },
    rightEnabled: { type: "boolean", default: true },
    leftColor: { type: "color", default: "#cfc7c6" },
    rightColor: { type: "color", default: "#cfc7c6" },
    cursorSize: { type: "number", default: 0.01 },
    raycastLength: { type: "number", default: 10 }
  },

  init() {
    this.handleTriggerDown = this.handleTriggerDown.bind(this);
    this.handleTriggerUp = this.handleTriggerUp.bind(this);
    this.handleGripDown = this.handleGripDown.bind(this);
    this.handleGripUp = this.handleGripUp.bind(this);
    this.handleAButtonDown = this.handleAButtonDown.bind(this);
    this.handleAButtonUp = this.handleAButtonUp.bind(this);
    this.handleBButtonDown = this.handleBButtonDown.bind(this);
    this.handleBButtonUp = this.handleBButtonUp.bind(this);
    this.handleXButtonDown = this.handleXButtonDown.bind(this);
    this.handleXButtonUp = this.handleXButtonUp.bind(this);
    this.handleYButtonDown = this.handleYButtonDown.bind(this);
    this.handleYButtonUp = this.handleYButtonUp.bind(this);
    
    this.controllerEls = [];

    this.el.sceneEl.addEventListener('loaded', () => {
      this.setupControllers();
    });
    
    if (!AFRAME.components["raycaster-cursor"]) {
      this.registerRaycasterCursor();
    }
  },

  setupControllers() {
    const rig = this.el.sceneEl.querySelector("#rig");
    
    if (this.data.leftEnabled) {
      const leftHand = this.createController("left", this.data.leftColor);
      this.controllerEls.push(leftHand);
      
      if (rig) {
        rig.appendChild(leftHand);
      } else {
        this.el.sceneEl.appendChild(leftHand);
      }
    }
    
    if (this.data.rightEnabled) {
      const rightHand = this.createController("right", this.data.rightColor);
      this.controllerEls.push(rightHand);

      if (rig) {
        rig.appendChild(rightHand);
      } else {
        this.el.sceneEl.appendChild(rightHand);
      }
    }
  },
  
  createController(hand, color) {
    const controller = document.createElement("a-entity");
    controller.setAttribute("id", `${hand}Hand`);
    controller.setAttribute("oculus-touch-controls", `hand: ${hand}`);
    
    controller.setAttribute("raycaster", {
      showLine: true,
      lineColor: color,
      far: this.data.raycastLength,
      direction: "0 -0.4 -1",
      origin: "0 0 0",
      objects: ".interactive, .clickable"
    });
    
    controller.addEventListener("triggerdown", this.handleTriggerDown);
    controller.addEventListener("triggerup", this.handleTriggerUp);
    controller.addEventListener("gripdown", this.handleGripDown);
    controller.addEventListener("gripup", this.handleGripUp);
    controller.addEventListener("abuttondown", this.handleAButtonDown);
    controller.addEventListener("abuttonup", this.handleAButtonUp);
    controller.addEventListener("bbuttondown", this.handleBButtonDown);
    controller.addEventListener("bbuttonup", this.handleBButtonUp);
    controller.addEventListener("xbuttondown", this.handleXButtonDown);
    controller.addEventListener("xbuttonup", this.handleXButtonUp);
    controller.addEventListener("ybuttondown", this.handleYButtonDown);
    controller.addEventListener("ybuttonup", this.handleYButtonUp);
    
    const cursor = document.createElement("a-sphere");
    cursor.setAttribute("radius", this.data.cursorSize);
    cursor.setAttribute("material", {
      color: color,
      shader: "flat",
      transparent: true,
      depthTest: true
    });
    cursor.setAttribute("position", "0 0 0");
    cursor.setAttribute("raycaster-cursor", "");
    cursor.setAttribute("auto-scale", {
      enabled: true,
      factor: 1.0
    }); 
    controller.appendChild(cursor);
    
    return controller;
  },

  handleTriggerDown(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      const intersectedEl = raycaster.intersectedEls[0];
      intersectedEl.emit("triggerdown");
    }
  },

  handleTriggerUp(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("triggerup");
    }
  },

  handleGripDown(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("gripdown");
    }
  },

  handleGripUp(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("gripup");
    }
  },

  handleAButtonDown(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("abuttondown");
    }
  },

  handleAButtonUp(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("abuttonup");
    }
  },

  handleBButtonDown(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("bbuttondown");
    }
  },

  handleBButtonUp(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("bbuttonup");
    }
  },

  handleXButtonDown(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("xbuttondown");
    }
  },

  handleXButtonUp(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("xbuttonup");
    }
  },

  handleYButtonDown(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("ybuttondown");
    }
  },

  handleYButtonUp(evt) {
    const controller = evt.target;
    const raycaster = controller.components.raycaster;
    
    if (raycaster && raycaster.intersectedEls.length > 0) {
      raycaster.intersectedEls[0].emit("ybuttonup");
    }
  },

  update(oldData) {
    if (this.needsControllerRecreation(oldData)) {
      this.remove();
      this.setupControllers();
    }
  },
  
  needsControllerRecreation(oldData) {
    return (
      oldData.leftEnabled !== undefined && oldData.leftEnabled !== this.data.leftEnabled ||
      oldData.rightEnabled !== undefined && oldData.rightEnabled !== this.data.rightEnabled ||
      oldData.leftColor !== undefined && oldData.leftColor !== this.data.leftColor ||
      oldData.rightColor !== undefined && oldData.rightColor !== this.data.rightColor ||
      oldData.cursorSize !== undefined && oldData.cursorSize !== this.data.cursorSize
    );
  },

  remove() {
    this.controllerEls.forEach(controller => {
      controller.removeEventListener("triggerdown", this.handleTriggerDown);
      controller.removeEventListener("triggerup", this.handleTriggerUp);
      controller.removeEventListener("gripdown", this.handleGripDown);
      controller.removeEventListener("gripup", this.handleGripUp);
      controller.removeEventListener("abuttondown", this.handleAButtonDown);
      controller.removeEventListener("abuttonup", this.handleAButtonUp);
      controller.removeEventListener("bbuttondown", this.handleBButtonDown);
      controller.removeEventListener("bbuttonup", this.handleBButtonUp);
      controller.removeEventListener("xbuttondown", this.handleXButtonDown);
      controller.removeEventListener("xbuttonup", this.handleXButtonUp);
      controller.removeEventListener("ybuttondown", this.handleYButtonDown);
      controller.removeEventListener("ybuttonup", this.handleYButtonUp);
      
      if (controller.parentNode) {
        controller.parentNode.removeChild(controller);
      }
    });
    
    this.controllerEls = [];
  },

  registerRaycasterCursor() {
    AFRAME.registerComponent("raycaster-cursor", {
      init: function() {
        this.cursorDirection = new THREE.Vector3();
        this.defaultDistance = 0;
        
        this.onLoaded = this.onLoaded.bind(this);
        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);
        
        this.el.parentNode.addEventListener("loaded", this.onLoaded);
        this.el.parentNode.addEventListener("raycaster-intersection", this.onIntersection);
        this.el.parentNode.addEventListener("raycaster-intersection-cleared", this.onIntersectionCleared);
      },
      
      onLoaded: function() {
        if (this.el.parentNode.components.raycaster) {
          this.raycaster = this.el.parentNode.components.raycaster;
          this.defaultDistance = this.raycaster.data.far;
          
          const direction = this.raycaster.data.direction;
          if (typeof direction === 'string') {
            const dir = direction.split(' ').map(Number);
            this.cursorDirection.set(dir[0], dir[1], dir[2]).normalize();
          } else if (typeof direction === 'object') {
            this.cursorDirection.set(
              direction.x !== undefined ? direction.x : 0, 
              direction.y !== undefined ? direction.y : 0, 
              direction.z !== undefined ? direction.z : -1
            ).normalize();
          } else {
            this.cursorDirection.set(0, 0, -1).normalize();
          }
          
          this.updateCursorPosition(this.defaultDistance);
        }
      },
      
      onIntersection: function(evt) {
        const intersection = evt.detail.intersections[0];
        if (intersection) {
          this.updateCursorPosition(intersection.distance);
        }
      },
      
      onIntersectionCleared: function() {
        this.updateCursorPosition(this.defaultDistance);
      },
      
      updateCursorPosition: function(distance) {
        const pos = this.cursorDirection.clone().multiplyScalar(distance);
        this.el.object3D.position.copy(pos);
      },

      tick: function() {
        if (!this.raycaster) return;
        
        if (this.raycaster.intersections && this.raycaster.intersections.length > 0) {
          const closestIntersection = this.raycaster.intersections[0];
          this.updateCursorPosition(closestIntersection.distance);
        } else {
          this.updateCursorPosition(this.defaultDistance);
        }
      },
      
      remove: function() {
        this.el.parentNode.removeEventListener("loaded", this.onLoaded);
        this.el.parentNode.removeEventListener("raycaster-intersection", this.onIntersection);
        this.el.parentNode.removeEventListener("raycaster-intersection-cleared", this.onIntersectionCleared);
      }
    });
  }
});