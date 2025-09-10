// Utilities for stretchable interactions

// Finds a stretchable whose world-space bounding box is near the pinch point
// and returns the nearest corner information. This guards the behavior so it
// only triggers for elements with the `stretchable` component and only when the
// pinch is actually close to the element's surface and a corner. The function
// also assigns a score to prefer tight proximity to the box and its corner.
export function findNearestStretchableCorner(pointWorld, elements) {
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  let best = null;
  let bestScore = Infinity; // Lower is better

  const MAX_BOX_TOUCH_DISTANCE = 0.03; // ~3 cm from box surface to allow selection
  const MAX_CORNER_SELECT_DISTANCE = 0.06; // ~6 cm to prefer corner grabs over face hits

  for (const el of elements) {
    if (!el.object3D) continue;
    el.object3D.updateMatrixWorld(true);
    box.setFromObject(el.object3D);
    if (box.isEmpty()) continue;

    // Require pinch point to be close to the element's surface
    const distToBox = box.distanceToPoint(pointWorld);
    if (distToBox > MAX_BOX_TOUCH_DISTANCE) continue;

    const min = box.min;
    const max = box.max;
    const corners = [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, max.z),
    ];

    // Find nearest corner but only accept if also close to that corner
    let localBestCorner = null;
    let localBestCornerDist = Infinity;
    for (const corner of corners) {
      const d = corner.distanceTo(pointWorld);
      if (d < localBestCornerDist) {
        localBestCornerDist = d;
        localBestCorner = corner;
      }
    }

    if (localBestCorner && localBestCornerDist <= MAX_CORNER_SELECT_DISTANCE) {
      // Score prefers smaller distance to box, then corner proximity
      const score = distToBox * 2 + localBestCornerDist;
      if (score < bestScore) {
        bestScore = score;
        box.getCenter(center);
        best = {
          targetEl: el,
          closestCornerWorld: localBestCorner.clone(),
          centerWorld: center.clone(),
          initialScale: el.object3D.scale.clone(),
        };
      }
    }
  }

  if (!best || !best.targetEl) return null;
  return best;
}

// Computes the midpoint between thumb-tip and index-tip in world coordinates.
// Returns a THREE.Vector3 or null if hand tracking poses are not available.
export function getPinchMidpointWorld(handEl) {
  const handTrackingControls = handEl.components["hand-tracking-controls"];
  if (
    !handTrackingControls ||
    !handTrackingControls.hasPoses ||
    !handTrackingControls.jointPoses
  )
    return null;

  const tempMatrix = new THREE.Matrix4();
  const tempPosition = new THREE.Vector3();
  const toWorld = new THREE.Vector3();

  const jointPoses = handTrackingControls.jointPoses;

  const thumb = _getJointLocalPosition(
    jointPoses,
    "thumb-tip",
    tempMatrix,
    tempPosition
  );
  const index = _getJointLocalPosition(
    jointPoses,
    "index-finger-tip",
    tempMatrix,
    tempPosition
  );

  if (!thumb || !index) return null;

  const thumbWorld = handEl.object3D.localToWorld(thumb.clone());
  const indexWorld = handEl.object3D.localToWorld(index.clone());

  return toWorld.copy(thumbWorld).add(indexWorld).multiplyScalar(0.5);
}

function _getJointLocalPosition(
  jointPoses,
  jointName,
  tempMatrix,
  tempPosition
) {
  const jointIndex = {
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
  }[jointName];

  if (jointIndex === undefined) return null;
  const matrixOffset = jointIndex * 16;
  tempMatrix.fromArray(jointPoses, matrixOffset);
  return tempPosition.setFromMatrixPosition(tempMatrix).clone();
}
