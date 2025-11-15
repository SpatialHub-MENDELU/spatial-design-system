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
    dimensionAxes: {
      type: "array",
      default: ["x", "y", "z"],
    },
    maxSize: { type: "number", default: 1.5 },
    minSize: { type: "number", default: 0.5 },
    maxBoxTouchDistance: { type: "number", default: 0.03 },
    maxCornerSelectDistance: { type: "number", default: 0.06 },
    // Note: maxCornerSelectDistance is larger than maxBoxTouchDistance because:
    // 1. First we check if you're close to the box surface (strict: 3cm)
    // 2. Then we check if you're close to any corner of that box (looser: 6cm)
    // This allows corner selection even when the corner extends beyond the surface threshold
  },
  init() {
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.classList.add("interactable", "interactive", "clickable");

    // Store the original scale for scaling bounds calculation
    this.originalScale = this.el.object3D.scale.clone();

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

    // Both scale and dimensions modes require corner interaction for precise control
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

    // Both modes use the same corner-based scaling logic
    const centerWorld = best.centerWorld.clone();
    const initialScale = best.initialScale.clone();
    const axes = best.axes;

    // Vector from element center to the intersection point
    const initialVector = new THREE.Vector3()
      .copy(intersectionPoint)
      .sub(centerWorld);

    const initialLocal = new THREE.Vector3(
      axes[0].dot(initialVector),
      axes[1].dot(initialVector),
      axes[2].dot(initialVector)
    );

    const initialLocalAbs = new THREE.Vector3(
      Math.abs(initialLocal.x),
      Math.abs(initialLocal.y),
      Math.abs(initialLocal.z)
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
      initialLocalAbs,
      uniform: this.data.mode === "scale",
      axes,
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
      initialLocalAbs,
      axes,
      uniform,
    } = this.pinchState;

    const currentVector = new THREE.Vector3()
      .copy(currentPoint)
      .sub(centerWorld);

    const currentDistanceToCenter = currentVector.length();
    if (currentDistanceToCenter < 1e-6) return;

    const currentLocal = new THREE.Vector3(
      axes[0].dot(currentVector),
      axes[1].dot(currentVector),
      axes[2].dot(currentVector)
    );
    const currentLocalAbs = new THREE.Vector3(
      Math.abs(currentLocal.x),
      Math.abs(currentLocal.y),
      Math.abs(currentLocal.z)
    );

    // Calculate scale bounds (used by both uniform and non-uniform scaling)
    // Use scale factors applied to the original scale
    const maxX = this.originalScale.x * this.data.maxSize;
    const maxY = this.originalScale.y * this.data.maxSize;
    const maxZ = this.originalScale.z * this.data.maxSize;
    const minX = this.originalScale.x * this.data.minSize;
    const minY = this.originalScale.y * this.data.minSize;
    const minZ = this.originalScale.z * this.data.minSize;

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
        initialLocalAbs.x > EPS
          ? currentLocalAbs.x / initialLocalAbs.x
          : currentDistanceToCenter / initialDistanceToCenter;
      const sy =
        initialLocalAbs.y > EPS
          ? currentLocalAbs.y / initialLocalAbs.y
          : currentDistanceToCenter / initialDistanceToCenter;
      const sz =
        initialLocalAbs.z > EPS
          ? currentLocalAbs.z / initialLocalAbs.z
          : currentDistanceToCenter / initialDistanceToCenter;

      // Apply dimensionAxes restrictions for dimensions mode only
      const allowedAxes = this.data.dimensionAxes || ["x", "y", "z"];

      const newScaleX = allowedAxes.includes("x")
        ? Math.min(maxX, Math.max(minX, initialScale.x * sx))
        : initialScale.x;

      const newScaleY = allowedAxes.includes("y")
        ? Math.min(maxY, Math.max(minY, initialScale.y * sy))
        : initialScale.y;

      const newScaleZ = allowedAxes.includes("z")
        ? Math.min(maxZ, Math.max(minZ, initialScale.z * sz))
        : initialScale.z;

      this.el.object3D.scale.set(newScaleX, newScaleY, newScaleZ);
    }
  },

  onStretchEnd(evt) {
    if (!this.isActive) return;

    this.pinchState = null;
    this.isActive = false;
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
