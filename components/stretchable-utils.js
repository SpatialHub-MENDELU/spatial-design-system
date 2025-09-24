import { jointIndices } from "./ar/hands-utils.js";

// Utilities for stretchable interactions

// Finds a stretchable whose world-space bounding box is near the pinch point
// and returns the nearest corner information. This guards the behavior so it
// only triggers for elements with the `stretchable` component and only when the
// pinch is actually close to the element's surface and a corner. The function
// also assigns a score to prefer tight proximity to the box and its corner.
export function findNearestStretchableCorner(pointWorld, elements) {
  const center = new THREE.Vector3();
  let best = null;
  let bestScore = Infinity; // Lower is better

  const MAX_BOX_TOUCH_DISTANCE = 0.03; // ~3 cm from box surface to allow selection
  const MAX_CORNER_SELECT_DISTANCE = 0.06; // ~6 cm to prefer corner grabs over face hits

  for (const el of elements) {
    if (!el.object3D) continue;
    el.object3D.updateMatrixWorld(true);

    const { box } = computeContentBoundingBox(el.object3D);
    if (!box || box.isEmpty()) continue;

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

// Computes a robust bounding box for multi-layer UI objects by:
// 1) Considering all visible Mesh children
// 2) Selecting meshes whose XY area is within a tolerance of the median area (to ignore outliers like outlines)
// 3) Aligning boxes to the average center to ignore translated duplicates (e.g., shadows)
export function computeContentBoundingBox(rootObject3D) {
  const meshes = [];
  rootObject3D.traverse((obj) => {
    if (obj === rootObject3D) return;
    if (!obj.visible) return;
    if (obj.isMesh) meshes.push(obj);
  });

  const box = new THREE.Box3();
  if (meshes.length === 0) {
    box.setFromObject(rootObject3D);
    return { box };
  }

  const tmpBox = new THREE.Box3();
  const items = [];
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    tmpBox.setFromObject(mesh);
    if (tmpBox.isEmpty()) continue;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    tmpBox.getSize(size);
    tmpBox.getCenter(center);
    const areaXY = Math.max(1e-6, size.x * size.y);
    items.push({ size, center, areaXY });
  }

  if (items.length === 0) {
    box.setFromObject(rootObject3D);
    return { box };
  }

  // Median-based selection
  const areas = items.map((it) => it.areaXY).sort((a, b) => a - b);
  const median = areas[Math.floor(areas.length / 2)];
  const TOL = 0.2; // 20% tolerance around median area
  const selected = items.filter((it) => {
    return it.areaXY >= median * (1 - TOL) && it.areaXY <= median * (1 + TOL);
  });
  const group = selected.length > 0 ? selected : items;

  // Average center
  const avgCenter = new THREE.Vector3();
  for (const it of group) avgCenter.add(it.center);
  avgCenter.multiplyScalar(1 / group.length);

  // Max half-extents aligned to avg center
  let halfX = 0,
    halfY = 0,
    halfZ = 0;
  for (const it of group) {
    halfX = Math.max(halfX, it.size.x * 0.5);
    halfY = Math.max(halfY, it.size.y * 0.5);
    halfZ = Math.max(halfZ, it.size.z * 0.5);
  }

  box.min.set(avgCenter.x - halfX, avgCenter.y - halfY, avgCenter.z - halfZ);
  box.max.set(avgCenter.x + halfX, avgCenter.y + halfY, avgCenter.z + halfZ);
  return { box, center: avgCenter };
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
  const jointIndex = jointIndices[jointName];

  if (jointIndex === undefined) return null;
  const matrixOffset = jointIndex * 16;
  tempMatrix.fromArray(jointPoses, matrixOffset);
  return tempPosition.setFromMatrixPosition(tempMatrix).clone();
}
