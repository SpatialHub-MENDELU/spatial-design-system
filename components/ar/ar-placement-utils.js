window.ARPlacementUtils = {
    // Core detection methods
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

        if (validSurfaceTypes.includes("horizontal") && Math.abs(normal.y) > 1 - EPSILON) return true;
        if (validSurfaceTypes.includes("wall") && Math.abs(normal.y) < EPSILON) return true;
        if (validSurfaceTypes.includes("ceiling") && normal.y < -1 + EPSILON) return true;

        return false;
    },

    isHeightValid: function(hitMesh, heightRange = { x: 0.3, y: 2.0 }) {
        return hitMesh.position.y >= heightRange.x && hitMesh.position.y <= heightRange.y;
    },

    isDistanceValid: function(hitMesh, camera, distanceRange = { x: 0.5, y: 5.0 }) {
        const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
        return cameraPosition.distanceTo(hitMesh.position) >= distanceRange.x &&
            cameraPosition.distanceTo(hitMesh.position) <= distanceRange.y;
    },

    // Reset object rotation to identity
    resetRotation: function(entity) {
        entity.object3D.rotation.set(0, 0, 0);
        entity.object3D.quaternion.identity();
    },

    // Get surface normal from hit mesh
    getSurfaceNormal: function(hitMesh) {
        return new THREE.Vector3(0, 1, 0)
            .applyQuaternion(hitMesh.quaternion)
            .normalize();
    },

    // Handle placement for all object types
    handlePlacement: function(entity, isPoster, hitMesh, camera, faceCamera, surfaceType) {
        if (surfaceType === 'floor') {
            if (isPoster) {
                // Floor poster
                entity.object3D.rotation.set(-Math.PI/2, 0, 0); // Flat on floor

                if (faceCamera && camera) {
                    // Get direction to camera
                    const cameraPos = camera.getWorldPosition(new THREE.Vector3());
                    const objPos = entity.object3D.position.clone();

                    // Calculate angle from poster to camera (in XZ plane)
                    const dx = cameraPos.x - objPos.x;
                    const dz = cameraPos.z - objPos.z;
                    const angle = Math.atan2(dx, dz);

                    // Apply rotation - after the X rotation, Z is now pointing upward
                    entity.object3D.rotation.z = angle;
                }
            } else {
                // Regular object on floor - just face camera if needed
                if (faceCamera && camera) {
                    const cameraPos = camera.getWorldPosition(new THREE.Vector3());
                    const objPos = entity.object3D.position.clone();
                    const angle = Math.atan2(cameraPos.x - objPos.x, cameraPos.z - objPos.z);
                    entity.object3D.rotation.y = angle;
                }
            }
        }
        else if (surfaceType === 'wall') {
            // Get wall normal
            const normal = this.getSurfaceNormal(hitMesh);

            if (isPoster) {
                // WALL POSTER
                // Calculate rotation to place against wall
                const wallRotation = new THREE.Matrix4().lookAt(
                    new THREE.Vector3(0, 0, 0),  // origin
                    normal,                      // direction to look at (the wall normal)
                    new THREE.Vector3(0, 1, 0)   // world up vector
                );

                // Convert matrix to quaternion
                const wallQuat = new THREE.Quaternion().setFromRotationMatrix(wallRotation);

                // Rotate 180° to face outward, not into the wall
                const outwardQuat = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(0, Math.PI, 0)
                );

                // Apply: first wall orientation, then face outward
                entity.object3D.quaternion.copy(wallQuat).multiply(outwardQuat);
            } else {
                // REGULAR OBJECT ON WALL (e.g., GLTF model)

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
                    // For wall placement, adjust object to face outward from the wall
                    // while considering camera position
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
        }
        else if (surfaceType === 'ceiling') {
            if (isPoster) {
                // CEILING POSTER

                // 1. First rotate to face down (-Y)
                entity.object3D.rotation.set(Math.PI, 0, 0); // 180° around X

                // 2. Then rotate to be parallel to ceiling
                entity.object3D.rotation.x += -Math.PI/2; // -90° around X

                if (faceCamera && camera) {
                    // 3. Then face camera
                    const cameraPos = camera.getWorldPosition(new THREE.Vector3());
                    const objPos = entity.object3D.position.clone();

                    // Calculate angle from poster to camera
                    const dx = cameraPos.x - objPos.x;
                    const dz = cameraPos.z - objPos.z;

                    // Because of the previous rotations, we need to use Z rotation
                    // to orient the poster's top toward the camera
                    const angle = Math.atan2(dx, dz);
                    entity.object3D.rotation.z = angle;
                }
            } else {
                // REGULAR OBJECT ON CEILING
                // For ceiling, flip the object upside down
                entity.object3D.rotateX(Math.PI);

                // Orient toward camera if requested
                if (faceCamera && camera) {
                    const cameraPos = camera.getWorldPosition(new THREE.Vector3());
                    const objPos = entity.object3D.position.clone();
                    const angle = Math.atan2(cameraPos.x - objPos.x, cameraPos.z - objPos.z);
                    entity.object3D.rotation.y = angle + Math.PI;
                }
            }
        }
        else {
            // Unknown surface
            entity.object3D.quaternion.copy(hitMesh.quaternion);

            if (faceCamera && camera) {
                const cameraPos = camera.getWorldPosition(new THREE.Vector3());
                const objPos = entity.object3D.position.clone();
                const angle = Math.atan2(cameraPos.x - objPos.x, cameraPos.z - objPos.z);
                entity.object3D.rotateY(angle);
            }
        }
    },

    // Apply custom rotation in degrees
    applyCustomRotation: function(entity, customRotation) {
        if (customRotation) {
            entity.object3D.rotateX(THREE.MathUtils.degToRad(customRotation.x));
            entity.object3D.rotateY(THREE.MathUtils.degToRad(customRotation.y));
            entity.object3D.rotateZ(THREE.MathUtils.degToRad(customRotation.z));
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

        // Check if it's a menu component
        const isMenu = entity.nodeName && entity.nodeName.toLowerCase() === 'a-ar-menu';
        const isPosterObject = isPoster || isMenu;

        // Set position to hit point
        entity.object3D.position.copy(hitMesh.position);

        // Reset rotation to identity (start fresh)
        this.resetRotation(entity);

        // Apply orientation based on surface if needed
        if (adjustOrientation) {
            // Determine surface type first
            const surfaceType = this.detectSurfaceType(hitMesh);

            // Unified placement handling
            this.handlePlacement(entity, isPosterObject, hitMesh, camera, faceCamera, surfaceType);
        }
        // Handle faceCamera separately when adjustOrientation is false
        else if (faceCamera && camera) {
            // Simply face camera when adjustOrientation is false
            const cameraPos = camera.getWorldPosition(new THREE.Vector3());
            const objPos = entity.object3D.position.clone();
            const angle = Math.atan2(cameraPos.x - objPos.x, cameraPos.z - objPos.z);
            entity.object3D.rotation.y = angle;
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