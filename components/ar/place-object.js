AFRAME.registerComponent("place-object", {
    schema: {
        heightRange: { type: "vec2", default: { x: 0.3, y: 2.0 } },     // Min/max height in meters
        surfaceTypes: { type: "array", default: ["horizontal"] },       // horizontal, wall, ceiling
        adjustOrientation: { type: "boolean", default: true },          // Orient to surface
        distanceRange: { type: "vec2", default: { x: 0.5, y: 5.0 } },   // Min/max distance from camera
        scale: { type: "number", default: 1.0 },                        // Scale of placed object
        isPoster: { type: "boolean", default: false },
    },

    init() {
        this.scene = this.el.sceneEl;
        this.controller = this.scene.renderer.xr.getController(0);
        this.camera = this.scene.camera;

        // Bind methods
        this.onSelect = this.onSelect.bind(this);

        // select event = tap in AR
        this.controller.addEventListener("select", this.onSelect);
    },

    onSelect() {
        const arHitTestMesh = this.scene.components["ar-hit-test"].bboxMesh;

        if (!arHitTestMesh) {
            console.warn("AR hit test mesh not found");
            return;
        }

        // Check if placement conditions are met
        if (this.isSurfaceValid(arHitTestMesh) &&
            this.isHeightValid(arHitTestMesh) &&
            this.isDistanceValid(arHitTestMesh)) {

            this.createAndPlaceObject(arHitTestMesh);
        }
    },

    isSurfaceValid(hitMesh) {
        const EPSILON = 0.15;
        const surfaceTypes = this.data.surfaceTypes;

        // Get surface normal from quaternion (up vector)
        const normal = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(hitMesh.quaternion)
            .normalize();

        // Check horizontal surfaces (floor-like)
        if (surfaceTypes.includes("horizontal") &&
            Math.abs(normal.y) > 1 - EPSILON) {
            return true;
        }

        // Check walls (vertical surfaces)
        if (surfaceTypes.includes("wall") &&
            Math.abs(normal.y) < EPSILON) {  // Normal is mostly horizontal
            return true;
        }

        // Check ceiling (upside-down horizontal)
        if (surfaceTypes.includes("ceiling") &&
            normal.y < -1 + EPSILON) {
            return true;
        }

        return false;
    },


    isHeightValid(hitMesh) {
        const minHeight = this.data.heightRange.x;
        const maxHeight = this.data.heightRange.y;

        return hitMesh.position.y >= minHeight && hitMesh.position.y <= maxHeight;
    },

    isDistanceValid(hitMesh) {
        const minDistance = this.data.distanceRange.x;
        const maxDistance = this.data.distanceRange.y;

        const cameraPosition = this.camera.getWorldPosition(new THREE.Vector3());
        const distance = cameraPosition.distanceTo(hitMesh.position);

        return distance >= minDistance && distance <= maxDistance;
    },

    async createAndPlaceObject(hitMesh) {
        try {
            // Create a copy of the entity
            const entityCopy = this.el.cloneNode(true);
            entityCopy.setAttribute('visible', true);
            entityCopy.removeAttribute('id');
            entityCopy.removeAttribute('place-object');
            entityCopy.removeAttribute('position');

            // Set position to hit point
            const hitPointPosition = Object.values(hitMesh.position);
            console.log(`setting entity position to ${JSON.stringify(hitPointPosition)}`);
            entityCopy.object3D.position.set(...hitPointPosition);

            // Determine surface type
            const surfaceType = this.detectSurfaceType(hitMesh);

            // Start with hit mesh orientation
            entityCopy.object3D.quaternion.copy(hitMesh.quaternion);

            if (this.data.adjustOrientation) {
                // Check if it's a poster/menu that should lay flat
                const isPosterObject = this.data.isPoster || entityCopy.nodeName.toLowerCase() === 'a-ar-menu';

                if (isPosterObject) {
                    this.handlePosterPlacement(entityCopy, surfaceType);
                } else {
                    this.handleDefaultPlacement(entityCopy, surfaceType);
                }
            }

            // Set scale
            const scale = this.data.scale;
            entityCopy.object3D.scale.set(scale, scale, scale);

            // Add to scene
            this.scene.appendChild(entityCopy);

            // Emit event that object was placed
            this.el.emit("object-placed", {
                entity: entityCopy,
                position: entityCopy.object3D.position.clone(),
                orientation: entityCopy.object3D.quaternion.clone()
            });

        } catch (error) {
            console.error("Error placing object:", error);
        }
    },

    detectSurfaceType(hitMesh) {
        // Get the surface normal from the quaternion
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

    handlePosterPlacement(entity, surfaceType) {
        switch (surfaceType) {
            case 'floor':
                // Reset rotation completely first
                entity.object3D.rotation.set(0, 0, 0);
                entity.object3D.quaternion.identity();

                // Rotate around X axis to lay flat on floor (-90 degrees)
                entity.object3D.rotateX(-Math.PI/2);

                // Orient toward camera
                this.orientTowardCamera(entity);
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

                // Orient toward camera with 180 degree offset
                this.orientTowardCamera(entity, Math.PI);
                break;

            default:
                // Default behavior for unknown surfaces
                break;
        }
    },

    handleDefaultPlacement(entity, surfaceType) {
        // For non-poster items, use standard orientation
        if (surfaceType === 'wall') {
            // For walls, rotate to face outward
            entity.object3D.rotateY(Math.PI);
        }
        // Other surface types keep default orientation
    },

    orientTowardCamera(entity, additionalRotation = 0) {
        // Get camera position for orientation
        const cameraPos = this.camera.getWorldPosition(new THREE.Vector3());
        const objPos = entity.object3D.position.clone();

        // Direction from object to camera (ignore y)
        const direction = new THREE.Vector3(
            cameraPos.x - objPos.x,
            0,
            cameraPos.z - objPos.z
        ).normalize();

        // Calculate angle to face camera
        const angle = Math.atan2(direction.x, direction.z);

        // Apply rotation to face camera (with optional additional rotation)
        entity.object3D.rotateZ(angle + additionalRotation);
    },

    remove() {
        // Clean up event listeners
        if (this.controller) {
            this.controller.removeEventListener("select", this.onSelect);
        }
    }
});