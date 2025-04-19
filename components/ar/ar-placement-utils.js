window.ARPlacementUtils = {
    // Detect surface type from hit mesh
    detectSurfaceType: function(hitMesh) {
        // Get surface normal from quaternion
        const normal = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(hitMesh.quaternion)
            .normalize();

        // Determine surface type
        const isWall = Math.abs(normal.y) < 0.15;
        const isFloor = normal.y > 0.85;
        const isCeiling = normal.y < -0.85;

        if (isWall) return 'wall';
        if (isFloor) return 'floor';
        if (isCeiling) return 'ceiling';
        return 'unknown';
    },

    // Validation methods
    isSurfaceValid: function(hitMesh, validSurfaceTypes = ["horizontal"]) {
        const EPSILON = 0.15;
        const normal = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(hitMesh.quaternion)
            .normalize();

        // Check horizontal surfaces (floor-like)
        if (validSurfaceTypes.includes("horizontal") &&
            Math.abs(normal.y) > 1 - EPSILON) {
            return true;
        }

        // Check walls (vertical surfaces)
        if (validSurfaceTypes.includes("wall") &&
            Math.abs(normal.y) < EPSILON) {
            return true;
        }

        // Check ceiling (upside-down horizontal)
        if (validSurfaceTypes.includes("ceiling") &&
            normal.y < -1 + EPSILON) {
            return true;
        }

        return false;
    },

    isHeightValid: function(hitMesh, heightRange = { x: 0.3, y: 2.0 }) {
        const minHeight = heightRange.x;
        const maxHeight = heightRange.y;
        return hitMesh.position.y >= minHeight && hitMesh.position.y <= maxHeight;
    },

    isDistanceValid: function(hitMesh, camera, distanceRange = { x: 0.5, y: 5.0 }) {
        const minDistance = distanceRange.x;
        const maxDistance = distanceRange.y;
        const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
        return cameraPosition.distanceTo(hitMesh.position) >= minDistance &&
            cameraPosition.distanceTo(hitMesh.position) <= maxDistance;
    },

    // Core placement function
    placeObject: function(entity, hitMesh, options) {
        const {
            isPoster = false,
            adjustOrientation = true,
            faceCamera = false,
            scale = 1.0,
            camera = null,
            customRotation = { x: 0, y: 0, z: 0 }
        } = options || {};

        // Set position to hit point
        entity.object3D.position.copy(hitMesh.position);

        // Reset rotation to identity (start fresh)
        entity.object3D.rotation.set(0, 0, 0);
        entity.object3D.quaternion.identity();

        // Start with surface orientation if adjustOrientation is true
        if (adjustOrientation) {
            // Determine surface type first
            const surfaceType = this.detectSurfaceType(hitMesh);

            // Check if it's a poster/menu object
            const isPosterObject = isPoster || entity.nodeName.toLowerCase() === 'a-ar-menu';

            if (isPosterObject) {
                this.handlePosterPlacement(entity, surfaceType, camera, faceCamera, hitMesh);
            } else {
                this.handleDefaultPlacement(entity, surfaceType, hitMesh);
            }
        }

        // Apply custom rotation (always applied, regardless of other settings)
        // Convert degrees to radians
        if (customRotation) {
            entity.object3D.rotateX(THREE.MathUtils.degToRad(customRotation.x));
            entity.object3D.rotateY(THREE.MathUtils.degToRad(customRotation.y));
            entity.object3D.rotateZ(THREE.MathUtils.degToRad(customRotation.z));
        }

        // Set scale
        entity.object3D.scale.set(scale, scale, scale);

        return {
            position: entity.object3D.position.clone(),
            orientation: entity.object3D.quaternion.clone()
        };
    },

    // Handle placement for poster-like objects
    handlePosterPlacement: function(entity, surfaceType, camera, faceCamera, hitMesh) {
        switch (surfaceType) {
            case 'floor':
                // Reset rotation completely first
                entity.object3D.rotation.set(0, 0, 0);
                entity.object3D.quaternion.identity();

                // Rotate around X axis to lay flat on floor (-90 degrees)
                entity.object3D.rotateX(-Math.PI/2);

                // Orient toward camera if requested and camera is available
                if (faceCamera && camera) {
                    this.orientTowardCamera(entity, camera);
                }
                break;

            case 'wall':
                // On wall: flat against wall, top facing up
                // First get the wall normal
                const normal = new THREE.Vector3(0, 1, 0)
                    .applyQuaternion(hitMesh.quaternion)
                    .normalize();

                // Create a quaternion to rotate from default orientation to wall orientation
                const wallRotation = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 0, 1), // Default forward vector
                    normal
                );
                entity.object3D.quaternion.copy(wallRotation);

                // Adjust to make it flush with the wall
                entity.object3D.rotateY(Math.PI);
                break;

            case 'ceiling':
                // On ceiling: lay flat against ceiling
                entity.object3D.rotation.set(0, 0, 0);
                entity.object3D.quaternion.identity();
                entity.object3D.rotateX(-Math.PI/2);

                // Orient toward camera with 180 degree offset if requested
                if (faceCamera && camera) {
                    this.orientTowardCamera(entity, camera, Math.PI);
                }
                break;
        }
    },

    // Handle placement for standard objects
    handleDefaultPlacement: function(entity, surfaceType, hitMesh) {
        // Start with identity rotation
        entity.object3D.rotation.set(0, 0, 0);
        entity.object3D.quaternion.identity();

        switch (surfaceType) {
            case 'floor':
                // Default orientation - no additional rotation needed
                break;

            case 'wall':
                // For walls, make the object "stand" on the wall
                // First, get the wall normal
                const normal = new THREE.Vector3(0, 1, 0)
                    .applyQuaternion(hitMesh.quaternion)
                    .normalize();

                // The wall normal gives us the direction to rotate toward
                // Create a rotation from the up vector to the wall normal
                const wallRotation = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0), // Up vector
                    normal                      // Wall normal
                );

                // Apply the rotation
                entity.object3D.quaternion.copy(wallRotation);

                // Now rotate around the wall normal to make it face outward
                // Calculate the outward direction (perpendicular to wall normal)
                const outward = new THREE.Vector3(0, 0, -1);
                outward.applyQuaternion(hitMesh.quaternion);
                outward.normalize();

                // Create a temporary object to help with rotation
                const tempObj = new THREE.Object3D();
                tempObj.position.copy(entity.object3D.position);
                tempObj.lookAt(tempObj.position.clone().add(outward));

                // Extract the y-rotation to apply to our model
                const lookRotation = new THREE.Euler().setFromQuaternion(tempObj.quaternion);
                entity.object3D.rotateY(lookRotation.y);
                break;

            case 'ceiling':
                // For ceiling, flip the object upside down
                entity.object3D.rotateX(Math.PI);
                break;

            default:
                // For unknown surfaces, use the hit-test orientation
                entity.object3D.quaternion.copy(hitMesh.quaternion);
                break;
        }
    },

    // Orient entity to face the camera (for floor/ceiling placements)
    orientTowardCamera: function(entity, camera, additionalRotation = 0) {
        // Get camera position for orientation
        const cameraPos = camera.getWorldPosition(new THREE.Vector3());
        const objPos = entity.object3D.position.clone();

        // Direction from object to camera (ignore y)
        const direction = new THREE.Vector3(
            cameraPos.x - objPos.x,
            0,
            cameraPos.z - objPos.z
        ).normalize();

        // Calculate angle to face camera
        const angle = Math.atan2(direction.x, direction.z);

        // Apply rotation to face camera
        entity.object3D.rotateZ(angle + additionalRotation);
    }
};