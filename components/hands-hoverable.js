import * as AFRAME from "aframe";
import * as THREE from "three";
import { VARIANT_DARK_COLOR } from "../utils/colors";
import { OBB } from "three/addons/math/OBB.js";
import { computeElementBoundingBox } from "./stretchable-utils.js";

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
    this.tempObb = new OBB();
    this.tempSize = new THREE.Vector3();
    this.tempMatrix4 = new THREE.Matrix4();
    this.tempQuaternion = new THREE.Quaternion();

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

    if (
      this.isHighlighted &&
      (oldData.overlaySizeRatio !== this.data.overlaySizeRatio ||
        oldData.useWireframe !== this.data.useWireframe)
    ) {
      this.ensureOverlayBox(true);
      this.updateOverlayBoxTransform();
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
      if (this.data.useOverlayGeometry) {
        this.ensureOverlayBox();
        this.updateOverlayBoxTransform();
      }
    } else {
      if (this.overlayBox) this.overlayBox.visible = false;
    }

    this.isHighlighted = highlight;
  },

  tick() {
    if (!this.isHighlighted || !this.data.useOverlayGeometry) return;
    this.updateOverlayBoxTransform();
  },

  ensureOverlayBox(forceMaterialUpdate = false) {
    if (!this.data.useOverlayGeometry) return;
    if (!this.overlayBox) {
      if (!this.el.sceneEl || !this.el.sceneEl.object3D) return;
      try {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
          color: this.data.hoverColor,
          transparent: !this.data.useWireframe,
          opacity: this.data.useWireframe ? 1.0 : 0.4,
          wireframe: this.data.useWireframe,
        });
        this.overlayBox = new THREE.Mesh(geometry, material);
        this.overlayBox.visible = false;
        this.el.sceneEl.object3D.add(this.overlayBox);
      } catch (error) {
        console.error("Hoverable: Error creating bounding box overlay", error);
        return;
      }
    }

    if (this.overlayBox && forceMaterialUpdate) {
      this.overlayBox.material.wireframe = this.data.useWireframe;
      this.overlayBox.material.transparent = !this.data.useWireframe;
      this.overlayBox.material.opacity = this.data.useWireframe ? 1.0 : 0.4;
      this.overlayBox.material.color.set(this.data.hoverColor);
      this.overlayBox.material.needsUpdate = true;
    }
  },

  updateOverlayBoxTransform() {
    if (!this.overlayBox) return;

    this.el.object3D.updateMatrixWorld(true);
    const objectBBox = computeElementBoundingBox(this.el);

    if (!objectBBox) {
      this.overlayBox.visible = false;
      return;
    }

    this.tempObb.fromBox3(objectBBox);
    this.tempObb.applyMatrix4(this.el.object3D.matrixWorld);

    this.tempMatrix4.setFromMatrix3(this.tempObb.rotation);
    this.tempQuaternion.setFromRotationMatrix(this.tempMatrix4);

    const padding = this.data.overlaySizeRatio;
    this.tempSize.copy(this.tempObb.halfSize).multiplyScalar(2);
    this.tempSize.set(
      this.tempSize.x + padding * 2,
      this.tempSize.y + padding * 2,
      this.tempSize.z + padding * 2
    );

    this.overlayBox.position.copy(this.tempObb.center);
    this.overlayBox.quaternion.copy(this.tempQuaternion);
    this.overlayBox.scale.copy(this.tempSize);
    this.overlayBox.visible = true;
  },
});
