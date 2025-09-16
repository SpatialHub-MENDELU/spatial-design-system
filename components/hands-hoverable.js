import * as AFRAME from "aframe";
import { VARIANT_DARK_COLOR } from "../utils/colors";

AFRAME.registerComponent("hands-hoverable", {
  schema: {
    hoverEffect: {
      type: "string",
      default: "border",
      oneOf: ["border", "color"],
    },
    hoverColor: { type: "color", default: VARIANT_DARK_COLOR },
  },
  init() {
    this.isIntersecting = false;
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.classList.add("interactable");

    this.baseColor = null;

    this.borderLine = null;
    this.isHighlighted = false;

    this.onHoverStart = this.onHoverStart.bind(this);
    this.onHoverEnd = this.onHoverEnd.bind(this);

    // this.el.addEventListener("hand-hover-started", this.onHoverStart);
    // this.el.addEventListener("hand-hover-ended", this.onHoverEnd);
    this.el.addEventListener("obbcollisionstarted", this.onHoverStart);
    this.el.addEventListener("obbcollisionended", this.onHoverEnd);
  },

  update(oldData) {
    if (oldData.hoverEffect && oldData.hoverEffect !== this.data.hoverEffect) {
      if (this.isIntersecting) {
        this.handleHoverEnd(oldData.hoverEffect);
        this.handleHoverStart(this.data.hoverEffect);
      }
    }

    if (this.isIntersecting) {
      // If hoverColor changed, update the active effect
      if (oldData.hoverColor && this.data.hoverColor !== oldData.hoverColor) {
        if (this.data.hoverEffect === "color") {
          this.el.setAttribute("material", "color", this.data.hoverColor);
        } else if (this.data.hoverEffect === "border" && this.borderLine) {
          this.borderLine.material.color.set(this.data.hoverColor);
        }
      }
    }
  },

  remove() {
    this.el.removeEventListener("hand-hover-started", this.onHoverStart);
    this.el.removeEventListener("hand-hover-ended", this.onHoverEnd);
    if (this.borderLine && this.borderLine.parent) {
      this.borderLine.parent.remove(this.borderLine);
      this.borderLine.geometry.dispose();
      this.borderLine.material.dispose();
      this.borderLine = null;
    }
  },

  onHoverStart(event) {
    this.isIntersecting = true;
    const isPointing = event.detail.withEl.getAttribute("pointing");
    // const isPointing = false;
    console.log("hover started", { isPointing });
    if (isPointing === "true") {
      return;
    }
    this.handleHoverStart(this.data.hoverEffect);
  },

  onHoverEnd(event) {
    this.isIntersecting = false;
    const isPointing = event.detail.withEl.getAttribute("pointing");
    console.log("hover ended", { isPointing });
    if (isPointing === "true") {
      return;
    }
    this.handleHoverEnd(this.data.hoverEffect);
  },

  handleHoverStart(effect) {
    if (effect === "color") {
      const buttonComponent = this.el.components.button;
      if (buttonComponent) {
        this.baseColor = buttonComponent.data.primary;
        this.el.setAttribute("button", "primary", this.data.hoverColor);
      } else {
        const material = this.el.getAttribute("material");
        if (material) {
          this.baseColor = material.color;
        }
        this.el.setAttribute("material", "color", this.data.hoverColor);
      }
    } else if (effect === "border") {
      this.highlightElement(true);
    }
  },

  handleHoverEnd(effect) {
    if (effect === "color") {
      if (this.baseColor) {
        const buttonComponent = this.el.components.button;
        if (buttonComponent) {
          this.el.setAttribute("button", "primary", this.baseColor);
        } else {
          this.el.setAttribute("material", "color", this.baseColor);
        }
      }
      this.baseColor = null;
    } else if (effect === "border") {
      this.highlightElement(false);
    }
  },

  highlightElement(highlight) {
    if (this.data.hoverEffect !== "border") return;
    if (this.isHighlighted === highlight) return;

    let mesh = this.el.getObject3D("mesh");

    // If the main object is a group (like in a button), find the first mesh within it.
    if (mesh && mesh.isGroup) {
      mesh = mesh.children.find((child) => child.isMesh);
    }

    if (!mesh) {
      // Fallback for entities that might not set a mesh directly
      this.el.object3D.traverse((node) => {
        if (node.isMesh && !mesh) mesh = node;
      });
      if (!mesh) return;
    }

    if (highlight) {
      if (!this.borderLine) {
        try {
          const geometry = mesh.geometry;
          if (!geometry) return;

          const edges = new THREE.EdgesGeometry(geometry);
          const material = new THREE.LineBasicMaterial({
            color: this.data.hoverColor,
            transparent: true,
            opacity: 1.0,
          });

          this.borderLine = new THREE.LineSegments(edges, material);
          this.borderLine.position.z = 0.001;
          mesh.parent.add(this.borderLine);
        } catch (error) {
          console.error("Hoverable: Error creating highlight", error);
        }
      }
      if (this.borderLine) this.borderLine.visible = true;
    } else {
      if (this.borderLine) this.borderLine.visible = false;
    }

    this.isHighlighted = highlight;
  },
});
