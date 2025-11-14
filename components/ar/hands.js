import * as AFRAME from "aframe";
import { appendTo } from "../../utils/utils.js";

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

AFRAME.registerComponent("hands", {
  schema: {
    leftEnabled: { type: "boolean", default: true },
    rightEnabled: { type: "boolean", default: true },
    leftHandColor: { type: "color", default: "#edccb6" },
    rightHandColor: { type: "color", default: "#edccb6" },

    autoDisableIfNoHands: { type: "boolean", default: true },
  },

  init() {
    this.handsEls = [];

    this.hoverByHand = new Map();

    // Finger touch helpers
    this.prevTipWorldPosByHand = new Map();

    // Store pointing state to avoid unnecessary attribute updates
    this.pointingStateByHand = new Map();

    this.handlePinchStarted = this.handlePinchStarted.bind(this);
    this.handlePinchEnded = this.handlePinchEnded.bind(this);
    this.handlePinchMoved = this.handlePinchMoved.bind(this);
    this.handleCollisionStarted = this.handleCollisionStarted.bind(this);
    this.handleCollisionEnded = this.handleCollisionEnded.bind(this);

    this.el.sceneEl.addEventListener("loaded", () => {
      if (this.data.autoDisableIfNoHands) {
        const gl = this.el.sceneEl.renderer?.xr?.getSession?.();
        const supported = !!gl?.inputSources?.some?.((s) => s.hand);
        if (!supported) return;
      }
      this.setupHands();
    });
  },

  tick() {
    this.detectTipTap();
  },

  setupHands() {
    // Get the rig element - rig is important in XR mode, because it is the parent of the hands
    const rig = this.el.sceneEl.querySelector("#rig");

    if (this.data.leftEnabled) {
      const leftHand = this.createHand("left", this.data.leftHandColor);
      this.handsEls.push(leftHand);
      appendTo(leftHand, rig);
    }
    if (this.data.rightEnabled) {
      const rightHand = this.createHand("right", this.data.rightHandColor);
      this.handsEls.push(rightHand);
      appendTo(rightHand, rig);
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
    handEl.setAttribute("pointing", false);

    handEl.addEventListener("pinchstarted", this.handlePinchStarted);
    handEl.addEventListener("pinchended", this.handlePinchEnded);
    handEl.addEventListener("pinchmoved", this.handlePinchMoved);
    handEl.addEventListener("obbcollisionstarted", this.handleCollisionStarted);
    handEl.addEventListener("obbcollisionended", this.handleCollisionEnded);

    return handEl;
  },

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
    const targetEl = evt.detail.withEl;
    const handEl = evt.target;

    this.hoverByHand.set(handEl, targetEl);

    if (targetEl.hasAttribute("hands-hoverable")) {
      targetEl.emit("hand-hover-started", { hand: handEl, side: handEl.id });
    }
  },

  handleCollisionEnded(evt) {
    const targetEl = evt.detail.withEl;
    const handEl = evt.target;

    if (this.hoverByHand.get(handEl) === targetEl)
      this.hoverByHand.delete(handEl);

    if (targetEl.hasAttribute("hands-hoverable")) {
      targetEl.emit("hand-hover-ended", { hand: handEl, side: handEl.id });
    }
  },

  // To make the click work, we need to check, whether the tip is pointing at the object and if the position is within the object's bounds
  detectTipTap: (function () {
    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();

    const EXTENDED_FINGER_THRESHOLD = 0.08; // 8cm - this is the distance between the index finger tip and the index finger metacarpal
    const CURLED_FINGER_THRESHOLD = 0.05; // 5cm - this is the distance between the other fingers tips and the metacarpals

    // Helper to get joint position from the jointPoses array.
    function getJointPosition(jointPoses, jointName) {
      const jointIndex = jointIndices[jointName];
      if (jointIndex === undefined) return null;

      // This matrixOffset is the offset in the jointPoses array to get the position of the joint, each joint has 16 values in the array.
      const matrixOffset = jointIndex * 16;
      tempMatrix.fromArray(jointPoses, matrixOffset);
      return tempPosition.setFromMatrixPosition(tempMatrix).clone();
    }

    return function () {
      this.handsEls.forEach((handEl) => {
        const handTrackingControls =
          handEl.components["hand-tracking-controls"];
        if (
          !handTrackingControls ||
          !handTrackingControls.hasPoses ||
          !handTrackingControls.jointPoses
        ) {
          // If tracking is lost, skip processing for this hand
          return;
        }

        const jointPoses = handTrackingControls.jointPoses;

        // Gesture detection using individual joint data
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

        if (!indexTipPos || !indexMetacarpalPos) {
          return;
        }

        const indexDist = indexTipPos.distanceTo(indexMetacarpalPos);

        // Calculate distances for other fingers, defaulting to 0 if positions unavailable
        const middleDist =
          middleTipPos && middleMetacarpalPos
            ? middleTipPos.distanceTo(middleMetacarpalPos)
            : 0;
        const ringDist =
          ringTipPos && ringMetacarpalPos
            ? ringTipPos.distanceTo(ringMetacarpalPos)
            : 0;
        const pinkyDist =
          pinkyTipPos && pinkyMetacarpalPos
            ? pinkyTipPos.distanceTo(pinkyMetacarpalPos)
            : 0;

        const isPointing =
          indexDist > EXTENDED_FINGER_THRESHOLD &&
          (middleDist < CURLED_FINGER_THRESHOLD ||
            ringDist < CURLED_FINGER_THRESHOLD ||
            pinkyDist < CURLED_FINGER_THRESHOLD);

        // Only update attribute if pointing state has changed
        const currentPointingState =
          this.pointingStateByHand.get(handEl) || false;
        if (currentPointingState !== isPointing) {
          this.pointingStateByHand.set(handEl, isPointing);
          handEl.setAttribute("pointing", isPointing);
        }
      });
    };
  })(),

  update(oldData) {
    if (this.needsHandRecreation(oldData)) {
      this.remove();
      this.setupHands();
    }
  },

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
    if (this.pointingStateByHand) {
      this.pointingStateByHand.clear();
    }
  },
});
