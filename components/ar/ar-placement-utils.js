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
            entity.object3D.quaternion.copy(hitMesh.quaternion);

            // Determine surface type
            const surfaceType = this.detectSurfaceType(hitMesh);

            // Check if it's a poster/menu object
            const isPosterObject = isPoster || entity.nodeName.toLowerCase() === 'a-ar-menu';

            if (isPosterObject) {
                this.handlePosterPlacement(entity, surfaceType, camera, faceCamera);
            } else {
                this.handleDefaultPlacement(entity, surfaceType);
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
    handlePosterPlacement: function(entity, surfaceType, camera, faceCamera) {
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
                const adjustRotation = new THREE.Quaternion()
                    .setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
                entity.object3D.quaternion.multiply(adjustRotation);
                break;

            case 'ceiling':
                // On ceiling: lay flat against ceiling
                entity.object3D.rotateX(-Math.PI/2);

                // Orient toward camera with 180 degree offset if requested
                if (faceCamera && camera) {
                    this.orientTowardCamera(entity, camera, Math.PI);
                }
                break;
        }
    },

    // Handle placement for standard objects
    handleDefaultPlacement: function(entity, surfaceType) {
        if (surfaceType === 'wall') {
            // For walls, make the object face outward properly
            // First reset to identity quaternion (needed for consistent behavior)
            entity.object3D.quaternion.identity();

            // Get wall normal from hitMesh quaternion
            const normal = new THREE.Vector3(0, 0, 1)
                .applyQuaternion(entity.object3D.quaternion)
                .normalize();

            // Create rotation to align with wall normal
            const alignWithWall = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1), // Default forward vector
                normal
            );

            // Apply rotation
            entity.object3D.quaternion.multiply(alignWithWall);
        }
        // Other surface types keep default orientation from hitMesh
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
