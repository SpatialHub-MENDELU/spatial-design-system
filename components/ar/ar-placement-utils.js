window.ARPlacementUtils = {
    // ---------- CORE SURFACE DETECTION ----------

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

    // ---------- VALIDATION METHODS ----------

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

    // ---------- ORIENTATION UTILITIES ----------

    // Get surface normal from hit mesh
    getSurfaceNormal: function(hitMesh) {
        return new THREE.Vector3(0, 1, 0)
            .applyQuaternion(hitMesh.quaternion)
            .normalize();
    },

    // Get direction from object to camera (XZ plane only)
    getDirectionToCamera: function(objPosition, camera) {
        const cameraPos = camera.getWorldPosition(new THREE.Vector3());

        return new THREE.Vector3(
            cameraPos.x - objPosition.x,
            0,
            cameraPos.z - objPosition.z
        ).normalize();
    },

    // Orient object to face the camera
    orientTowardCamera: function(entity, camera, additionalRotation = 0) {
        const cameraPos = camera.getWorldPosition(new THREE.Vector3());
        const objPos = entity.object3D.position.clone();

        // Direction from object to camera (ignore y)
        const direction = this.getDirectionToCamera(objPos, camera);

        // Calculate angle to face camera
        const angle = Math.atan2(direction.x, direction.z);

        // Apply rotation to face camera
        entity.object3D.rotateY(angle + additionalRotation);
    },

    // ---------- PLACEMENT METHODS ----------

    // Reset object rotation to identity (preserving position)
    resetRotation: function(entity) {
        entity.object3D.rotation.set(0, 0, 0);
        entity.object3D.quaternion.identity();
    },

    // Apply custom rotation in degrees
    applyCustomRotation: function(entity, customRotation) {
        if (customRotation) {
            entity.object3D.rotateX(THREE.MathUtils.degToRad(customRotation.x));
            entity.object3D.rotateY(THREE.MathUtils.degToRad(customRotation.y));
            entity.object3D.rotateZ(THREE.MathUtils.degToRad(customRotation.z));
        }
    },

    // Handle floor placement
    handleFloorPlacement: function(entity, isPoster, camera, faceCamera) {
        if (isPoster) {
            // For poster objects on floor, lay flat
            entity.object3D.rotateX(-Math.PI/2);

            // Orient toward camera if requested
            if (faceCamera && camera) {
                this.orientTowardCamera(entity, camera);
            }
        } else {
            // For regular objects on floor, use default orientation
            // No additional rotation needed for the base position

            // But we might need to face the camera
            if (faceCamera && camera) {
                this.orientTowardCamera(entity, camera);
            }
        }
    },

    // Handle wall placement
    handleWallPlacement: function(entity, isPoster, hitMesh, camera, faceCamera) {
        // Get the wall normal
        const normal = this.getSurfaceNormal(hitMesh);

        if (isPoster) {
            // For poster objects on wall, lay flat against wall
            const wallRotation = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1), // Default forward vector
                normal
            );
            entity.object3D.quaternion.copy(wallRotation);

            // Adjust to make it flush with the wall
            entity.object3D.rotateY(Math.PI);
        } else {
            // For regular objects on wall, make it "stand" on the wall
            const wallRotation = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0), // Up vector
                normal                      // Wall normal
            );

            // Apply the rotation
            entity.object3D.quaternion.copy(wallRotation);

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

            // If face camera is enabled, adjust orientation
            if (faceCamera && camera) {
                // For wall placement, we'll adjust the object to face outward from the wall
                // while also considering the camera position
                const cameraPos = camera.getWorldPosition(new THREE.Vector3());
                const objPos = entity.object3D.position.clone();

                // Project camera position onto wall plane
                const projectedPos = cameraPos.clone().sub(
                    normal.clone().multiplyScalar(normal.dot(cameraPos.clone().sub(objPos)))
                );

                // Create direction from object to projected camera position
                const direction = projectedPos.sub(objPos).normalize();

                // Calculate angle
                const angle = Math.atan2(direction.x, direction.z);

                // Apply rotation based on the outward direction
                entity.object3D.rotateY(angle);
            }
        }
    },

    // Handle ceiling placement
    handleCeilingPlacement: function(entity, isPoster, camera, faceCamera) {
        if (isPoster) {
            // For poster objects on ceiling, lay flat
            entity.object3D.rotateX(-Math.PI/2);

            // Orient toward camera with 180 degree offset if requested
            if (faceCamera && camera) {
                this.orientTowardCamera(entity, camera, Math.PI);
            }
        } else {
            // For regular objects on ceiling, flip upside down
            entity.object3D.rotateX(Math.PI);

            // Orient toward camera if requested
            if (faceCamera && camera) {
                this.orientTowardCamera(entity, camera, Math.PI);
            }
        }
    },

    // Handle unknown surface placement
    handleUnknownPlacement: function(entity, hitMesh, camera, faceCamera) {
        // For unknown surfaces, use the hit-test orientation
        entity.object3D.quaternion.copy(hitMesh.quaternion);

        // Orient toward camera if requested
        if (faceCamera && camera) {
            this.orientTowardCamera(entity, camera);
        }
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
        this.resetRotation(entity);

        // Apply orientation based on surface if needed
        if (adjustOrientation) {
            // Determine surface type first
            const surfaceType = this.detectSurfaceType(hitMesh);

            // Apply appropriate orientation based on surface type
            switch (surfaceType) {
                case 'floor':
                    this.handleFloorPlacement(entity, isPoster, camera, faceCamera);
                    break;

                case 'wall':
                    this.handleWallPlacement(entity, isPoster, hitMesh, camera, faceCamera);
                    break;

                case 'ceiling':
                    this.handleCeilingPlacement(entity, isPoster, camera, faceCamera);
                    break;

                default:
                    this.handleUnknownPlacement(entity, hitMesh, camera, faceCamera);
                    break;
            }
        }
        // Handle faceCamera separately when adjustOrientation is false
        else if (faceCamera && camera) {
            // When adjustOrientation is false but faceCamera is true,
            // we just want to face the camera directly without any surface-specific adjustments
            this.orientTowardCamera(entity, camera);
        }

        // Apply custom rotation (always applied, regardless of other settings)
        this.applyCustomRotation(entity, customRotation);

        // Set scale
        entity.object3D.scale.set(scale, scale, scale);

        return {
            position: entity.object3D.position.clone(),
            orientation: entity.object3D.quaternion.clone()
        };
    }
};