import { findNearestStretchableCorner } from "./stretchable-utils.js";
import * as THREE from "three";
import "../components/vrinteractive.js";

AFRAME.registerComponent("stretchable", {
  schema: {
    mode: {
      type: "string",
      default: "dimensions",
      oneOf: ["scale", "dimensions"],
    },
    maxScaleFactor: { type: "number", default: 1.5 },
    minScaleFactor: { type: "number", default: 0.5 },
    maxBoxTouchDistance: { type: "number", default: 0.03 },
    maxCornerSelectDistance: { type: "number", default: 0.06 },
    // Note: maxCornerSelectDistance is larger than maxBoxTouchDistance because:
    // 1. First we check if you're close to the box surface (strict: 3cm)
    // 2. Then we check if you're close to any corner of that box (looser: 6cm)
    // This allows corner selection even when the corner extends beyond the surface threshold
  },
  init() {
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.setAttribute("vr-interactive", "");
    this.el.classList.add("interactable");

    // Pinch state for this stretchable object
    this.pinchState = null;
    this.isActive = false;

    // Bind event handlers
    this.onStretchStart = this.onStretchStart.bind(this);
    this.onStretchMove = this.onStretchMove.bind(this);
    this.onStretchEnd = this.onStretchEnd.bind(this);

    // Listen for pinch events
    this.el.addEventListener("stretch-start", this.onStretchStart);
    this.el.addEventListener("stretch-move", this.onStretchMove);
    this.el.addEventListener("stretch-end", this.onStretchEnd);

    // Listen for controller stretch events
    this.el.addEventListener("controller-stretch-start", this.onStretchStart);
    this.el.addEventListener("controller-stretch-move", this.onStretchMove);
    this.el.addEventListener("controller-stretch-end", this.onStretchEnd);
  },

  onStretchStart(evt) {
    if (this.isActive) return; // Already handling a stretch

    const detail = evt.detail;
    const intersectionPoint =
      detail.pinchPointWorld || detail.intersectionPoint;
    const handOrController = detail.hand || detail.controller;

    if (!intersectionPoint) return;

    // Scale mode: Only activate when pinching near corners for precise control
    // Dimensions mode: Activate on any intersection point
    let centerWorld;
    let initialScale;
    if (this.data.mode === "scale") {
      const stretchables = Array.from(
        this.el.sceneEl.querySelectorAll("[stretchable]")
      );
      const best = findNearestStretchableCorner(
        intersectionPoint,
        stretchables,
        this.data.maxBoxTouchDistance,
        this.data.maxCornerSelectDistance
      );
      if (!best || best.targetEl !== this.el) return; // Not a corner of this element
      centerWorld = best.centerWorld.clone();
      initialScale = best.initialScale.clone();
    } else {
      // Check if this stretchable is the closest to the intersection point
      if (!this.isClosestStretchable(intersectionPoint)) {
        return;
      }
      // Calculate center and initial scale
      const bbox = new THREE.Box3().setFromObject(this.el.object3D);
      centerWorld = new THREE.Vector3();
      bbox.getCenter(centerWorld);
      initialScale = this.el.object3D.scale.clone();
    }

    // Vector from element center to the intersection point
    const initialVector = new THREE.Vector3()
      .copy(intersectionPoint)
      .sub(centerWorld);
    const initialVectorAbs = new THREE.Vector3(
      Math.abs(initialVector.x),
      Math.abs(initialVector.y),
      Math.abs(initialVector.z)
    );
    const initialDistanceToCenter = initialVector.length();

    // Avoid zero-distance to prevent division by zero
    if (initialDistanceToCenter < 1e-6) return;

    // Store stretch state
    this.pinchState = {
      handOrController,
      initialScale,
      centerWorld,
      initialDistanceToCenter,
      initialVectorAbs,
      uniform: this.data.mode === "scale",
    };

    this.isActive = true;
  },

  onStretchMove(evt) {
    if (!this.isActive || !this.pinchState) return;

    const detail = evt.detail;
    const currentPoint = detail.pinchPointWorld || detail.intersectionPoint;

    if (!currentPoint) return;

    const {
      initialScale,
      centerWorld,
      initialDistanceToCenter,
      initialVectorAbs,
      uniform,
    } = this.pinchState;

    const currentVector = new THREE.Vector3()
      .copy(currentPoint)
      .sub(centerWorld);
    const currentVectorAbs = new THREE.Vector3(
      Math.abs(currentVector.x),
      Math.abs(currentVector.y),
      Math.abs(currentVector.z)
    );

    const currentDistanceToCenter = currentVector.length();
    if (currentDistanceToCenter < 1e-6) return;

    // Calculate scale bounds (used by both uniform and non-uniform scaling)
    const maxX = initialScale.x * this.data.maxScaleFactor;
    const maxY = initialScale.y * this.data.maxScaleFactor;
    const maxZ = initialScale.z * this.data.maxScaleFactor;
    const minX = initialScale.x * this.data.minScaleFactor;
    const minY = initialScale.y * this.data.minScaleFactor;
    const minZ = initialScale.z * this.data.minScaleFactor;

    // Uniform vs non-uniform scaling based on stretchable mode
    if (uniform) {
      const f =
        currentDistanceToCenter / Math.max(initialDistanceToCenter, 1e-6);
      const nx = Math.min(maxX, Math.max(minX, initialScale.x * f));
      const ny = Math.min(maxY, Math.max(minY, initialScale.y * f));
      const nz = Math.min(maxZ, Math.max(minZ, initialScale.z * f));
      this.el.object3D.scale.set(nx, ny, nz);
    } else {
      const EPS = 1e-4;
      const sx =
        initialVectorAbs.x > EPS
          ? currentVectorAbs.x / initialVectorAbs.x
          : currentDistanceToCenter / initialDistanceToCenter;
      const sy =
        initialVectorAbs.y > EPS
          ? currentVectorAbs.y / initialVectorAbs.y
          : currentDistanceToCenter / initialDistanceToCenter;
      const sz =
        initialVectorAbs.z > EPS
          ? currentVectorAbs.z / initialVectorAbs.z
          : currentDistanceToCenter / initialDistanceToCenter;

      const newScaleX = Math.min(maxX, Math.max(minX, initialScale.x * sx));
      const newScaleY = Math.min(maxY, Math.max(minY, initialScale.y * sy));
      const newScaleZ = Math.min(maxZ, Math.max(minZ, initialScale.z * sz));
      this.el.object3D.scale.set(newScaleX, newScaleY, newScaleZ);
    }
  },

  onStretchEnd(evt) {
    if (!this.isActive) return;

    this.pinchState = null;
    this.isActive = false;
  },

  isClosestStretchable(pinchPointWorld) {
    const stretchables = Array.from(
      this.el.sceneEl.querySelectorAll("[stretchable]")
    );

    let closestDistance = Infinity;
    let closestStretchable = null;

    stretchables.forEach((stretchableEl) => {
      const bbox = new THREE.Box3().setFromObject(stretchableEl.object3D);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const distance = center.distanceTo(pinchPointWorld);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestStretchable = stretchableEl;
      }
    });

    return closestStretchable === this.el;
  },

  remove() {
    this.el.removeEventListener("stretch-start", this.onStretchStart);
    this.el.removeEventListener("stretch-move", this.onStretchMove);
    this.el.removeEventListener("stretch-end", this.onStretchEnd);
    this.el.removeEventListener(
      "controller-stretch-start",
      this.onStretchStart
    );
    this.el.removeEventListener("controller-stretch-move", this.onStretchMove);
    this.el.removeEventListener("controller-stretch-end", this.onStretchEnd);
  },
});
