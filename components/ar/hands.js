import * as AFRAME from "aframe";
import { getPinchMidpointWorld } from "../stretchable-utils.js";
import { jointIndices } from "./hands-utils.js";

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
    const handEl = evt.currentTarget;
    const pinchPointWorld = getPinchMidpointWorld(handEl);
    if (!pinchPointWorld) return;

    // Emit pinch event to all stretchable objects - let them decide who handles it
    const stretchables = Array.from(
      this.el.sceneEl.querySelectorAll("[stretchable]")
    );

    stretchables.forEach((stretchableEl) => {
      stretchableEl.emit("stretch-start", {
        hand: handEl,
        pinchPointWorld: pinchPointWorld,
        handId: handEl.id,
      });
    });
  },

  handlePinchEnded(evt) {
    const handEl = evt.currentTarget;

    // Emit pinch end event to all stretchable objects
    const stretchables = Array.from(
      this.el.sceneEl.querySelectorAll("[stretchable]")
    );

    stretchables.forEach((stretchableEl) => {
      stretchableEl.emit("stretch-end", {
        hand: handEl,
        handId: handEl.id,
      });
    });
  },

  handlePinchMoved(evt) {
    const handEl = evt.currentTarget;
    const pinchPointWorld = getPinchMidpointWorld(handEl);
    if (!pinchPointWorld) return;

    // Emit pinch move event to all stretchable objects
    const stretchables = Array.from(
      this.el.sceneEl.querySelectorAll("[stretchable]")
    );

    stretchables.forEach((stretchableEl) => {
      stretchableEl.emit("stretch-move", {
        hand: handEl,
        pinchPointWorld: pinchPointWorld,
        handId: handEl.id,
      });
    });
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
