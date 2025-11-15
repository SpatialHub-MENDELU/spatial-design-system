import * as AFRAME from "aframe";
import * as THREE from "three";
import { VARIANT_DARK_COLOR } from "../utils/colors";
import { OBB } from "three/addons/math/OBB.js";

AFRAME.registerComponent("hands-hoverable", {
  schema: {
    useOverlayGeometry: { type: "boolean", default: true },
    useWireframe: { type: "boolean", default: false },
    overlaySizeRatio: { type: "number", default: 0.005 },
    hoverColor: { type: "color", default: VARIANT_DARK_COLOR },
  },
  init() {
    this.isIntersecting = false;
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.classList.add("interactable");

    this.overlayBox = null;
    this.isHighlighted = false;

    this.onHoverStart = this.onHoverStart.bind(this);
    this.onHoverEnd = this.onHoverEnd.bind(this);

    this.el.addEventListener("hand-hover-started", this.onHoverStart);
    this.el.addEventListener("hand-hover-ended", this.onHoverEnd);
  },

  update(oldData) {
    // If hoverColor changed while hovering, update the overlay color
    if (this.isIntersecting && oldData.hoverColor !== this.data.hoverColor) {
      if (this.overlayBox) {
        this.overlayBox.material.color.set(this.data.hoverColor);
      }
    }
  },

  remove() {
    this.el.removeEventListener("hand-hover-started", this.onHoverStart);
    this.el.removeEventListener("hand-hover-ended", this.onHoverEnd);

    if (this.overlayBox) {
      if (this.overlayBox.parent) {
        this.overlayBox.parent.remove(this.overlayBox);
      }
      if (this.overlayBox.geometry) {
        this.overlayBox.geometry.dispose();
      }
      if (this.overlayBox.material) {
        this.overlayBox.material.dispose();
      }
      this.overlayBox = null;
    }
  },

  onHoverStart(event) {
    this.isIntersecting = true;
    const isPointing = event.detail?.hand?.getAttribute("pointing");
    if (isPointing === "true") {
      return;
    }
    this.handleHoverStart();
  },

  onHoverEnd(event) {
    this.isIntersecting = false;
    const isPointing = event.detail?.hand?.getAttribute("pointing");
    if (isPointing === "true") {
      return;
    }
    this.handleHoverEnd();
  },

  handleHoverStart() {
    this.highlightElement(true);
  },

  handleHoverEnd() {
    this.highlightElement(false);
  },

  highlightElement(highlight) {
    if (this.isHighlighted === highlight) return;

    if (highlight) {
      if (this.data.useOverlayGeometry && !this.overlayBox) {
        try {
          // Get the bounding box of the element

          this.el.object3D.children[0]?.geometry?.computeBoundingBox();

          const bbox = new OBB();
          const objectBBox =
            this.el.object3D.children[0]?.geometry?.boundingBox;

          if (!objectBBox) return;

          bbox.fromBox3(objectBBox);
          bbox.applyMatrix4(this.el.object3D.matrixWorld);

          const size = new THREE.Vector3();
          bbox.getSize(size);

          const rot3 = bbox.rotation; // This is a THREE.Matrix3
          const rot4 = new THREE.Matrix4(); // Convert Matrix3 → Matrix4
          rot4.setFromMatrix3(rot3);

          const q = new THREE.Quaternion().setFromRotationMatrix(rot4); // Convert Matrix4 → Quaternion

          // Add padding to make overlay slightly larger and more visible
          const padding = this.data.overlaySizeRatio;
          const overlaySize = new THREE.Vector3(
            size.x + padding * 2,
            size.y + padding * 2,
            size.z + padding * 2
          );

          // Create overlay geometry - using box geometry for all elements
          const geometry = new THREE.BoxGeometry(
            overlaySize.x,
            overlaySize.y,
            overlaySize.z
          );

          // Create material - wireframe mode doesn't use transparency/opacity
          const material = new THREE.MeshBasicMaterial({
            color: this.data.hoverColor,
            transparent: !this.data.useWireframe,
            opacity: this.data.useWireframe ? 1.0 : 0.4,
            wireframe: this.data.useWireframe,
          });

          this.overlayBox = new THREE.Mesh(geometry, material);
          this.overlayBox.position.copy(bbox.center);
          this.overlayBox.quaternion.copy(q);

          // Add to scene root instead of as child of the element
          this.el.sceneEl.object3D.add(this.overlayBox);
        } catch (error) {
          console.error(
            "Hoverable: Error creating bounding box overlay",
            error
          );
        }
      }
      if (this.overlayBox) this.overlayBox.visible = true;
    } else {
      if (this.overlayBox) this.overlayBox.visible = false;
    }

    this.isHighlighted = highlight;
  },
});
