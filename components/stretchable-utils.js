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
  // Exclude meshes that belong to nested A-Frame entities (child elements)
  const box = new THREE.Box3();
  const childBox = new THREE.Box3();
  const tempMatrix = new THREE.Matrix4();
  const rootInverse = new THREE.Matrix4();

  el.object3D.updateMatrixWorld(true);
  rootInverse.copy(el.object3D.matrixWorld).invert();
  let hasGeometry = false;

  // Get all child entities' object3Ds to exclude their meshes
  const childEntityObject3Ds = new Set();
  for (const childEl of el.children) {
    if (childEl.object3D) {
      childEntityObject3Ds.add(childEl.object3D);
      // Also include any object3D in the object3DMap (like "mesh")
      if (childEl.object3DMap) {
        Object.values(childEl.object3DMap).forEach((obj3d) => {
          if (obj3d) childEntityObject3Ds.add(obj3d);
        });
      }
    }
  }

  el.object3D.traverse((child) => {
    if (child.isMesh && child.geometry) {
      // Check if this mesh belongs to a nested entity
      // Walk up the parent chain to see if we hit a child entity's object3D
      let belongsToChildEntity = false;
      let parent = child.parent;
      while (parent && parent !== el.object3D) {
        if (childEntityObject3Ds.has(parent)) {
          belongsToChildEntity = true;
          break;
        }
        parent = parent.parent;
      }

      // Skip meshes that belong to nested entities
      if (belongsToChildEntity) {
        return;
      }

      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox) {
        childBox.copy(child.geometry.boundingBox);
        tempMatrix.copy(child.matrixWorld).premultiply(rootInverse);
        childBox.applyMatrix4(tempMatrix);
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
  element,
  maxBoxTouchDistance,
  maxCornerSelectDistance
) {
  if (!element || !element.object3D) return null;

  const bbox = new OBB();
  const el = element;

  const objectBBox = computeElementBoundingBox(el);
  if (!objectBBox) return null;

  bbox.fromBox3(objectBBox);
  bbox.applyMatrix4(el.object3D.matrixWorld);

  const rot3 = bbox.rotation; // This is a THREE.Matrix3
  const rot4 = new THREE.Matrix4(); // Convert Matrix3 → Matrix4
  rot4.setFromMatrix3(rot3);

  el.object3D.updateMatrixWorld(true);

  const clamped = new THREE.Vector3();
  bbox.clampPoint(pointWorld, clamped);
  const distToBox = clamped.distanceTo(pointWorld);
  if (distToBox > maxBoxTouchDistance) return null;

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

  if (!localBestCorner || localBestCornerDist > maxCornerSelectDistance)
    return null;

  return {
    targetEl: el,
    closestCornerWorld: localBestCorner.clone(),
    centerWorld: bbox.center.clone(),
    initialScale: el.object3D.scale.clone(),
    axes: axes.map((axis) => axis.clone()),
  };
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
