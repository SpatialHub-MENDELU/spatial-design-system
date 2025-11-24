import { jointIndices } from "./ar/hands-utils.js";
import * as THREE from "three";
import { OBB } from "three/addons/math/OBB.js";

export function computeElementBoundingBox(el) {
  // First, try to get bounding box from geometry component (for primitives)
  const geometryComponent = el.components.geometry;
  if (geometryComponent && geometryComponent.geometry) {
    geometryComponent.geometry.computeBoundingBox();
    return geometryComponent.geometry.boundingBox;
  }

  // Fallback: compute bounding box from all meshes in the object3D
  const box = new THREE.Box3();
  let hasGeometry = false;

  el.object3D.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox) {
        const childBox = child.geometry.boundingBox.clone();
        childBox.applyMatrix4(child.matrixWorld);
        box.union(childBox);
        hasGeometry = true;
      }
    }
  });

  return hasGeometry ? box : null;
}

// Utilities for stretchable interactions

// Finds a stretchable whose world-space bounding box is near the pinch point
// and returns the nearest corner information. This guards the behavior so it
// only triggers for elements with the `stretchable` component and only when the
// pinch/controllers is actually close to the element's surface and a corner. The function
// also assigns a score to prefer tight proximity to the box and its corner.
export function findNearestStretchableCorner(
  pointWorld,
  elements,
  maxBoxTouchDistance,
  maxCornerSelectDistance
) {
  const bbox = new OBB();

  let best = null;
  let bestScore = Infinity; // Lower is better

  for (const el of elements) {
    if (!el.object3D) continue;

    const objectBBox = computeElementBoundingBox(el);
    if (!objectBBox) continue;

    bbox.fromBox3(objectBBox);
    bbox.applyMatrix4(el.object3D.matrixWorld);

    const rot3 = bbox.rotation; // This is a THREE.Matrix3
    const rot4 = new THREE.Matrix4(); // Convert Matrix3 → Matrix4
    rot4.setFromMatrix3(rot3);

    el.object3D.updateMatrixWorld(true);

    const clamped = new THREE.Vector3();
    bbox.clampPoint(pointWorld, clamped);
    const distToBox = clamped.distanceTo(pointWorld);
    if (distToBox > maxBoxTouchDistance) continue;

    const corners = [];

    const { center, halfSize, rotation } = bbox; // rotation = Matrix3
    const axes = [
      new THREE.Vector3(1, 0, 0).applyMatrix3(rotation),
      new THREE.Vector3(0, 1, 0).applyMatrix3(rotation),
      new THREE.Vector3(0, 0, 1).applyMatrix3(rotation),
    ];

    const signs = [
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(-1, -1, 1),
      new THREE.Vector3(-1, 1, -1),
      new THREE.Vector3(-1, 1, 1),
      new THREE.Vector3(1, -1, -1),
      new THREE.Vector3(1, -1, 1),
      new THREE.Vector3(1, 1, -1),
      new THREE.Vector3(1, 1, 1),
    ];

    for (const s of signs) {
      const corner = new THREE.Vector3().copy(center);
      corner.addScaledVector(axes[0], s.x * halfSize.x);
      corner.addScaledVector(axes[1], s.y * halfSize.y);
      corner.addScaledVector(axes[2], s.z * halfSize.z);
      corners.push(corner);
    }

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

    if (localBestCorner && localBestCornerDist <= maxCornerSelectDistance) {
      // Score prefers smaller distance to box, then corner proximity
      const score = distToBox * 2 + localBestCornerDist;
      if (score < bestScore) {
        bestScore = score;
        best = {
          targetEl: el,
          closestCornerWorld: localBestCorner.clone(),
          centerWorld: bbox.center.clone(),
          initialScale: el.object3D.scale.clone(),
          axes: axes.map((axis) => axis.clone()),
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
  const jointIndex = jointIndices[jointName];

  if (jointIndex === undefined) return null;
  // Joint positions are stored in a 4x4 matrix, so we need to offset the index by 16 (4x4 matrix) where should start data for the joint
  const matrixOffset = jointIndex * 16;
  tempMatrix.fromArray(jointPoses, matrixOffset);
  return tempPosition.setFromMatrixPosition(tempMatrix).clone();
}
