import * as AFRAME from "aframe";
import * as THREE from "three";
import { computeElementBoundingBox } from "./stretchable-utils.js";

AFRAME.registerComponent("finger-touch", {
  schema: {
    // How far (in metres) the fingertip may sit outside a child's geometry and
    // still count as touching it. UI surfaces are flat, so without some slack
    // nothing would ever contain the tip.
    tolerance: { type: "number", default: 0.02 },
  },

  init: function () {
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.classList.add("clickable");

    this.localPoint = new THREE.Vector3();
    this.boxCenter = new THREE.Vector3();
    this.worldScale = new THREE.Vector3();
    this.inverseMatrix = new THREE.Matrix4();
    this.candidateBox = new THREE.Box3();

    this.onHoverStart = this.onHoverStart.bind(this);
    this.onHoverEnd = this.onHoverEnd.bind(this);

    this.el.addEventListener("hand-hover-started", this.onHoverStart);
    this.el.addEventListener("hand-hover-ended", this.onHoverEnd);
  },

  onHoverStart(event) {
    const touchedEl = this.resolveTouch(event);
    if (!touchedEl) return;

    touchedEl.emit("click", {
      hand: event.detail.hand,
      side: event.detail.side,
    });
  },

  onHoverEnd(event) {
    const touchedEl = this.resolveTouch(event);
    if (!touchedEl) return;

    touchedEl.emit("click-ended", {
      hand: event.detail.hand,
      side: event.detail.side,
    });
  },

  // Returns the element the click belongs to, or null if this hover is not ours
  // to handle.
  resolveTouch(event) {
    const isPointing = event.detail?.hand?.getAttribute("pointing");
    if (isPointing !== "true") return null;

    // A nested `finger-touch` has its own collider and already handled this
    // hover before it bubbled up to us.
    if (event.target !== this.el) return null;

    return this.resolveTouchedEl(event.detail.point);
  },

  // The collider sits on this element, but what the finger actually poked may be
  // one of its clickable children (a menu item, a list row, ...). Pick the
  // deepest clickable descendant whose geometry contains the fingertip.
  resolveTouchedEl(worldPoint) {
    if (!worldPoint) return this.el;

    let touchedEl = this.el;
    let bestDepth = -1;
    let bestDistance = Infinity;

    this.el.querySelectorAll(".clickable, .interactive").forEach((candidate) => {
      const distance = this.distanceInside(candidate, worldPoint);
      if (distance === null) return;

      // Deeper wins: a button inside a panel beats the panel. The tolerance
      // makes neighbours overlap slightly, so at equal depth take whichever
      // the fingertip is most centred on.
      const depth = this.depthOf(candidate);
      if (depth < bestDepth) return;
      if (depth === bestDepth && distance >= bestDistance) return;

      touchedEl = candidate;
      bestDepth = depth;
      bestDistance = distance;
    });

    return touchedEl;
  },

  depthOf(el) {
    let depth = 0;
    let node = el;

    while (node && node !== this.el) {
      depth++;
      node = node.parentElement;
    }

    return depth;
  },

  // Distance from the fingertip to the centre of `el`'s geometry, or null if the
  // tip is not inside that geometry (within the tolerance).
  distanceInside(el, worldPoint) {
    const box = computeElementBoundingBox(el);
    if (!box) return null;

    el.object3D.updateMatrixWorld(true);
    this.inverseMatrix.copy(el.object3D.matrixWorld).invert();
    this.localPoint.copy(worldPoint).applyMatrix4(this.inverseMatrix);

    // The box is in local space, so convert the tolerance to local units too.
    el.object3D.getWorldScale(this.worldScale);
    const scale =
      Math.max(this.worldScale.x, this.worldScale.y, this.worldScale.z) || 1;

    this.candidateBox.copy(box).expandByScalar(this.data.tolerance / scale);
    if (!this.candidateBox.containsPoint(this.localPoint)) return null;

    return this.candidateBox
      .getCenter(this.boxCenter)
      .distanceTo(this.localPoint);
  },

  remove() {
    this.el.removeEventListener("hand-hover-started", this.onHoverStart);
    this.el.removeEventListener("hand-hover-ended", this.onHoverEnd);
  },
});
