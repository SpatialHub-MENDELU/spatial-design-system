AFRAME.registerComponent("stretchable", {
  schema: {
    mode: {
      type: "string",
      default: "dimensions",
      oneOf: ["scale", "dimensions"],
    },
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

    const scene = this.el.sceneEl;

    // This enables interaction with objects using controllers
    scene.addEventListener("enter-vr", () => {
      if (scene.states.some((state) => state === "vr-mode")) {
        this.el.setAttribute("vr-interactive", "");
      }
    });
  },

  onStretchStart(evt) {
    if (this.isActive) return; // Already handling a pinch

    const { pinchPointWorld, hand } = evt.detail;

    // Check if this stretchable is the closest to the pinch point
    if (!this.isClosestStretchable(pinchPointWorld)) {
      return;
    }

    // Calculate center and initial scale
    const bbox = new THREE.Box3().setFromObject(this.el.object3D);
    const centerWorld = new THREE.Vector3();
    bbox.getCenter(centerWorld);

    const initialScale = this.el.object3D.scale.clone();

    // Vector from element center to the pinch point
    const initialVector = new THREE.Vector3()
      .copy(pinchPointWorld)
      .sub(centerWorld);
    const initialVectorAbs = new THREE.Vector3(
      Math.abs(initialVector.x),
      Math.abs(initialVector.y),
      Math.abs(initialVector.z)
    );
    const initialDistanceToCenter = initialVector.length();

    // Avoid zero-distance to prevent division by zero
    if (initialDistanceToCenter < 1e-6) return;

    // Store pinch state
    this.pinchState = {
      hand,
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

    const { pinchPointWorld } = evt.detail;
    const {
      initialScale,
      centerWorld,
      initialDistanceToCenter,
      initialVectorAbs,
      uniform,
    } = this.pinchState;

    const currentVector = new THREE.Vector3()
      .copy(pinchPointWorld)
      .sub(centerWorld);
    const currentVectorAbs = new THREE.Vector3(
      Math.abs(currentVector.x),
      Math.abs(currentVector.y),
      Math.abs(currentVector.z)
    );

    const currentDistanceToCenter = currentVector.length();
    if (currentDistanceToCenter < 1e-6) return;

    // Uniform vs non-uniform scaling based on stretchable mode
    if (uniform) {
      const f =
        currentDistanceToCenter / Math.max(initialDistanceToCenter, 1e-6);
      const nx = Math.max(0.01, initialScale.x * f);
      const ny = Math.max(0.01, initialScale.y * f);
      const nz = Math.max(0.01, initialScale.z * f);
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

      const newScaleX = Math.max(0.01, initialScale.x * sx);
      const newScaleY = Math.max(0.01, initialScale.y * sy);
      const newScaleZ = Math.max(0.01, initialScale.z * sz);
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
  },
});
