import * as AFRAME from "aframe";

// Joint indices based on WebXR Hand Input spec.
const jointIndices = {
  wrist: 0,
  "thumb-metacarpal": 1,
  "thumb-phalanx-proximal": 2,
  "thumb-phalanx-distal": 3,
  "thumb-tip": 4,
  "index-finger-metacarpal": 5,
  "index-finger-phalanx-proximal": 6,
  "index-finger-phalanx-intermediate": 7,
  "index-finger-phalanx-distal": 8,
  "index-finger-tip": 9,
  "middle-finger-metacarpal": 10,
  "middle-finger-phalanx-proximal": 11,
  "middle-finger-phalanx-intermediate": 12,
  "middle-finger-phalanx-distal": 13,
  "middle-finger-tip": 14,
  "ring-finger-metacarpal": 15,
  "ring-finger-phalanx-proximal": 16,
  "ring-finger-phalanx-intermediate": 17,
  "ring-finger-phalanx-distal": 18,
  "ring-finger-tip": 19,
  "pinky-finger-metacarpal": 20,
  "pinky-finger-phalanx-proximal": 21,
  "pinky-finger-phalanx-intermediate": 22,
  "pinky-finger-phalanx-distal": 23,
  "pinky-finger-tip": 24,
};

const CLICK_COOLDOWN_MS = 250;

AFRAME.registerComponent("hands", {
  schema: {
    leftEnabled: { type: "boolean", default: true },
    rightEnabled: { type: "boolean", default: true },
    leftHandColor: { type: "color", default: "#edccb6" },
    rightHandColor: { type: "color", default: "#edccb6" },
  },

  init() {
    this.isTapping = false;
    this.tapStarted = 0;
    this.tapTarget = null;
    this.tapDetail = { wristRotation: new THREE.Quaternion() };
    this.indexTipPos = new THREE.Vector3();
    this.activeTargets = new Map(); // To track the currently touched element per hand
    this.pinchingTargets = new Map(); // Tracks which element is pinched by which hand.

    this.handlePinchStarted = this.handlePinchStarted.bind(this);
    this.handlePinchEnded = this.handlePinchEnded.bind(this);
    this.handlePinchMoved = this.handlePinchMoved.bind(this);

    this.handsEls = [];

    // Finger-touch helpers
    this.prevTipWorldPosByHand = new Map();
    this.lastClickAtByTarget = new WeakMap();

    this.el.sceneEl.addEventListener("loaded", () => {
      this.setupHands();
    });
  },

  tick() {
    this.detectTipTap();
  },

  setupHands() {
    const rig = this.el.sceneEl.querySelector("#rig");

    if (this.data.leftEnabled) {
      const leftHand = this.createHand("left", this.data.leftHandColor);
      this.handsEls.push(leftHand);

      if (rig) {
        rig.appendChild(leftHand);
      } else {
        this.el.sceneEl.appendChild(leftHand);
      }
    }

    if (this.data.rightEnabled) {
      const rightHand = this.createHand("right", this.data.rightHandColor);
      this.handsEls.push(rightHand);

      if (rig) {
        rig.appendChild(rightHand);
      } else {
        this.el.sceneEl.appendChild(rightHand);
      }
    }
  },

  createHand(hand, color) {
    const handEl = document.createElement("a-entity");
    handEl.setAttribute("id", `${hand}`);
    handEl.setAttribute(
      "hand-tracking-controls",
      `hand: ${hand}; modelColor: ${color};`
    );
    handEl.setAttribute(
      "hand-tracking-grab-controls",
      `hand: ${hand}; color: ${color}; hoverColor: #00ba92;`
    );

    handEl.addEventListener("pinchstarted", this.handlePinchStarted);
    handEl.addEventListener("pinchended", this.handlePinchEnded);
    handEl.addEventListener("pinchmoved", this.handlePinchMoved);
    handEl.addEventListener("obbcollisionstarted", this.handleCollisionStarted);

    return handEl;
  },

  // Detects when the user starts pinching
  handlePinchStarted(evt) {
    // TODO: Implement function to handle pinch started. (stretchable component)
  },

  handlePinchEnded(evt) {
    // TODO: Implement function to handle pinch ended.
  },

  handlePinchMoved(evt) {
    // TODO: Implement function to handle pinch moved.
  },

  // Detects collision between hands and objects
  handleCollisionStarted(evt) {
    console.log("collision started");
  },

  update(oldData) {
    if (this.needsHandRecreation(oldData)) {
      this.remove();
      this.setupHands();
    }
  },

  // To make the click work, we need to check, whether the tip is pointing at the object and if the position is within the object's bounds

  detectTipTap: (function () {
    const worldTipPos = new THREE.Vector3();
    const objectBBox = new THREE.Box3();
    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const objectCenter = new THREE.Vector3();
    const prevTipPos = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const dirToObject = new THREE.Vector3();

    const EXTENDED_FINGER_THRESHOLD = 0.08; // 8cm
    const CURLED_FINGER_THRESHOLD = 0.05; // 5cm

    // Helper to get joint position from the jointPoses array.
    function getJointPosition(jointPoses, jointName) {
      const jointIndex = jointIndices[jointName];
      if (jointIndex === undefined) return null;

      const matrixOffset = jointIndex * 16;
      tempMatrix.fromArray(jointPoses, matrixOffset);
      return tempPosition.setFromMatrixPosition(tempMatrix).clone();
    }

    return function () {
      const clickables = Array.from(
        this.el.sceneEl.querySelectorAll(".interactable, .clickable")
      );

      this.handsEls.forEach((handEl) => {
        let foundTargetThisFrame = null;
        const handTrackingControls =
          handEl.components["hand-tracking-controls"];
        if (
          !handTrackingControls ||
          !handTrackingControls.hasPoses ||
          !handTrackingControls.jointPoses
        ) {
          // If tracking is lost, ensure we clear any active target for this hand
          if (this.activeTargets.has(handEl)) {
            this.activeTargets.delete(handEl);
          }
          return;
        }

        const jointPoses = handTrackingControls.jointPoses;

        // 1. Gesture detection using individual joint data
        const indexTipPos = getJointPosition(jointPoses, "index-finger-tip");
        const indexMetacarpalPos = getJointPosition(
          jointPoses,
          "index-finger-metacarpal"
        );
        const middleTipPos = getJointPosition(jointPoses, "middle-finger-tip");
        const middleMetacarpalPos = getJointPosition(
          jointPoses,
          "middle-finger-metacarpal"
        );
        const ringTipPos = getJointPosition(jointPoses, "ring-finger-tip");
        const ringMetacarpalPos = getJointPosition(
          jointPoses,
          "ring-finger-metacarpal"
        );
        const pinkyTipPos = getJointPosition(jointPoses, "pinky-finger-tip");
        const pinkyMetacarpalPos = getJointPosition(
          jointPoses,
          "pinky-finger-metacarpal"
        );

        if (
          !indexTipPos ||
          !indexMetacarpalPos ||
          !middleTipPos ||
          !middleMetacarpalPos ||
          !ringTipPos ||
          !ringMetacarpalPos ||
          !pinkyTipPos ||
          !pinkyMetacarpalPos
        ) {
          return;
        }

        const indexDist = indexTipPos.distanceTo(indexMetacarpalPos);
        const middleDist = middleTipPos.distanceTo(middleMetacarpalPos);
        const ringDist = ringTipPos.distanceTo(ringMetacarpalPos);
        const pinkyDist = pinkyTipPos.distanceTo(pinkyMetacarpalPos);

        const isPointing =
          indexDist > EXTENDED_FINGER_THRESHOLD &&
          middleDist < CURLED_FINGER_THRESHOLD &&
          ringDist < CURLED_FINGER_THRESHOLD &&
          pinkyDist < CURLED_FINGER_THRESHOLD;

        if (isPointing) {
          // 2. Collision detection
          worldTipPos.copy(indexTipPos);
          handEl.object3D.localToWorld(worldTipPos);

          for (const el of clickables) {
            if (el === handEl || el.parentNode === handEl) continue;

            // Force update of the object's matrix and its children
            el.object3D.updateMatrixWorld(true);
            objectBBox.setFromObject(el.object3D);

            // Skip if bounding box is empty, which can happen for invisible or misconfigured objects.
            if (objectBBox.isEmpty()) {
              continue;
            }

            const TOUCH_THRESHOLD = 0.002;
            const distance = objectBBox.distanceToPoint(worldTipPos);

            if (distance < TOUCH_THRESHOLD) {
              foundTargetThisFrame = el;
              // Only trigger on first contact and when moving toward the object (not when backing out)
              if (this.activeTargets.get(handEl) !== el) {
                // Approach check and cooldown
                const now =
                  typeof performance !== "undefined"
                    ? performance.now()
                    : Date.now();
                const lastAt = this.lastClickAtByTarget.get(el) || 0;
                const cooldownOk = now - lastAt >= this.CLICK_COOLDOWN_MS;

                // Compute approach: require decreasing distance and positive velocity toward object center
                objectBBox.getCenter(objectCenter);

                const hadPrev = this.prevTipWorldPosByHand.has(handEl);
                let approachingOk = true;
                if (hadPrev) {
                  prevTipPos.copy(this.prevTipWorldPosByHand.get(handEl));
                  const prevDistance = objectBBox.distanceToPoint(prevTipPos);
                  const distanceDelta = prevDistance - distance; // positive if moving closer

                  velocity.copy(worldTipPos).sub(prevTipPos);
                  dirToObject.copy(objectCenter).sub(worldTipPos).normalize();
                  const approachDot = velocity.dot(dirToObject);

                  const APPROACH_DELTA_EPS = 0.0005; // 0.5 mm closer
                  approachingOk =
                    distanceDelta > APPROACH_DELTA_EPS && approachDot > 0;
                }

                if (cooldownOk && approachingOk) {
                  el.emit("click", { hand: handEl, side: handEl.id }, false);
                  this.activeTargets.set(handEl, el);
                  this.lastClickAtByTarget.set(el, now);
                }
              }
              // Found a target, no need to check other clickables for this hand
              break;
            }
          }
        }
        // If no target was found in this frame, but there was an active one, clear it.
        // This handles the "untouch" event, making the object clickable again.
        if (!foundTargetThisFrame && this.activeTargets.has(handEl)) {
          this.activeTargets.delete(handEl);
        }
        // Save fingertip position for approach checks next frame
        this.prevTipWorldPosByHand.set(handEl, worldTipPos.clone());
      });
    };
  })(),

  needsHandRecreation(oldData) {
    return (
      (oldData.leftEnabled !== undefined &&
        oldData.leftEnabled !== this.data.leftEnabled) ||
      (oldData.rightEnabled !== undefined &&
        oldData.rightEnabled !== this.data.rightEnabled) ||
      (oldData.leftHandColor !== undefined &&
        oldData.leftHandColor !== this.data.leftHandColor) ||
      (oldData.rightHandColor !== undefined &&
        oldData.rightHandColor !== this.data.rightHandColor)
    );
  },

  remove() {
    this.handsEls = [];
    if (this.activeTargets) {
      this.activeTargets.clear();
    }
    if (this.pinchingTargets) {
      this.pinchingTargets.clear();
    }
  },
});
