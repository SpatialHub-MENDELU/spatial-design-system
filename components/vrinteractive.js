import * as AFRAME from "aframe";

AFRAME.registerComponent("vr-interactive", {
  schema: {
    enabledButtons: { type: "array", default: ["trigger", "grip", "a", "b", "x", "y"] },
    clickAnimation: { type: "boolean", default: true },
    highlightEnabled: { type: "boolean", default: true },
    highlightColor: { type: "color", default: "#666666" },
    highlightOpacity: { type: "number", default: 1.0 },
    borderWidth: { type: "number", default: 2 },
    scaleOnClick: { type: "number", default: 0.9 }
  },

  init() {
    this.originalScale = this.el.object3D.scale.clone();
    this.borderLine = null;
    this.isHighlighted = false;
    this.intersecting = false;
    
    this.onRaycasterIntersected = this.onRaycasterIntersected.bind(this);
    this.onRaycasterIntersectedCleared = this.onRaycasterIntersectedCleared.bind(this);
    this.handleInteraction = this.handleInteraction.bind(this);
    this.handleInteractionEnd = this.handleInteractionEnd.bind(this);
    
    this.setupVRInteractions();
  },

  setupVRInteractions() {
    this.el.classList.add("interactive", "clickable");

    this.el.addEventListener("raycaster-intersected", this.onRaycasterIntersected);
    this.el.addEventListener("raycaster-intersected-cleared", this.onRaycasterIntersectedCleared);

    const buttonEvents = {
      "trigger": ["triggerdown", "triggerup"],
      "grip": ["gripdown", "gripup"],
      "a": ["abuttondown", "abuttonup"],
      "b": ["bbuttondown", "bbuttonup"],
      "x": ["xbuttondown", "xbuttonup"],
      "y": ["ybuttondown", "ybuttonup"]
    };

    this.data.enabledButtons.forEach(button => {
      if (buttonEvents[button]) {
        this.el.addEventListener(buttonEvents[button][0], this.handleInteraction);
        this.el.addEventListener(buttonEvents[button][1], this.handleInteractionEnd);
      }
    });
  },
  
  onRaycasterIntersected(evt) {
    this.raycaster = evt.detail.el.components.raycaster;
    this.intersecting = true;
    
    if (this.data.highlightEnabled) {
      this.highlightElement(true);
    }
  },
  
  onRaycasterIntersectedCleared(evt) {
    this.handleInteractionEnd();
    this.intersecting = false;
    this.raycaster = null;
    
    if (this.data.highlightEnabled) {
      this.highlightElement(false);
    }
  },

  handleInteraction(evt) {
    if (!this.intersecting) return;

    if (this.data.clickAnimation) {
      this.el.object3D.scale.multiplyScalar(this.data.scaleOnClick);
    }
    
    this.el.emit("click", { 
      source: "vr-controller", 
      button: evt.type.replace('buttondown', '').replace('down', '') 
    }, true);
  },

  handleInteractionEnd() {
    if (!this.intersecting) return;

    if (this.data.clickAnimation) {
      this.el.object3D.scale.copy(this.originalScale);
      
      if (this.borderLine) {
        this.borderLine.scale.copy(this.originalScale);
      }
    }
  },

  highlightElement(highlight) {
    if (this.isHighlighted === highlight) return;
    
    let mesh = this.el.getObject3D("mesh");
    if (!mesh) {
      for (const key in this.el.object3D.children) {
        if (this.el.object3D.children[key].isMesh) {
          mesh = this.el.object3D.children[key];
          break;
        }
      }
      
      if (!mesh) return;
    }

    if (highlight) {
      if (!this.borderLine) {
        try {
          const geometry = mesh.geometry;
          
          if (!geometry) {
            return;
          }
          
          const edges = new THREE.EdgesGeometry(geometry);

          const material = new THREE.LineBasicMaterial({
            color: this.data.highlightColor,
            linewidth: this.data.borderWidth,
            transparent: true,
            opacity: this.data.highlightOpacity
          });

          this.borderLine = new THREE.LineSegments(edges, material);

          this.borderLine.position.z = 0.001;

          mesh.parent.add(this.borderLine);
        } catch (error) {
          console.error("VRInteractive: Error creating highlight", error);
        }
      }
      
      if (this.borderLine) {
        this.borderLine.visible = true;
      }
    } else {
      if (this.borderLine) {
        this.borderLine.visible = false;
      }
    }

    this.isHighlighted = highlight;
  },

  update(oldData) {
    if (this.borderLine) {
      if (oldData.highlightColor !== undefined && 
          this.data.highlightColor !== oldData.highlightColor) {
        this.borderLine.material.color.set(this.data.highlightColor);
      }
      
      if (oldData.highlightOpacity !== undefined && 
          this.data.highlightOpacity !== oldData.highlightOpacity) {
        this.borderLine.material.opacity = this.data.highlightOpacity;
      }
    }
    
    this.updateEventListeners(oldData);
  },
  
  updateEventListeners(oldData) {
    const buttonEvents = {
      "trigger": ["triggerdown", "triggerup"],
      "grip": ["gripdown", "gripup"],
      "a": ["abuttondown", "abuttonup"],
      "b": ["bbuttondown", "bbuttonup"],
      "x": ["xbuttondown", "xbuttonup"],
      "y": ["ybuttondown", "ybuttonup"]
    };

    Object.keys(buttonEvents).forEach(button => {
      const [downEvent, upEvent] = buttonEvents[button];
      const wasEnabled = oldData.enabledButtons && oldData.enabledButtons.includes(button);
      const isEnabled = this.data.enabledButtons.includes(button);

      if (!wasEnabled && isEnabled) {
        this.el.addEventListener(downEvent, this.handleInteraction);
        this.el.addEventListener(upEvent, this.handleInteractionEnd);
      } else if (wasEnabled && !isEnabled) {
        this.el.removeEventListener(downEvent, this.handleInteraction);
        this.el.removeEventListener(upEvent, this.handleInteractionEnd);
      }
    });
  },

  remove() {
    if (this.borderLine && this.borderLine.parent) {
      this.borderLine.parent.remove(this.borderLine);
      this.borderLine.geometry.dispose();
      this.borderLine.material.dispose();
      this.borderLine = null;
    }

    if (this.data.clickAnimation) {
      this.el.object3D.scale.copy(this.originalScale);
    }
    
    this.el.removeEventListener("raycaster-intersected", this.onRaycasterIntersected);
    this.el.removeEventListener("raycaster-intersected-cleared", this.onRaycasterIntersectedCleared);
    
    const buttonEvents = {
      "trigger": ["triggerdown", "triggerup"],
      "grip": ["gripdown", "gripup"],
      "a": ["abuttondown", "abuttonup"],
      "b": ["bbuttondown", "bbuttonup"],
      "x": ["xbuttondown", "xbuttonup"],
      "y": ["ybuttondown", "ybuttonup"]
    };

    this.data.enabledButtons.forEach(button => {
      if (buttonEvents[button]) {
        this.el.removeEventListener(buttonEvents[button][0], this.handleInteraction);
        this.el.removeEventListener(buttonEvents[button][1], this.handleInteractionEnd);
      }
    });
  }
});