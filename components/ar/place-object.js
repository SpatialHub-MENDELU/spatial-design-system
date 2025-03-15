AFRAME.registerComponent("place-object", {
    schema: {
        heightRange: { type: "vec2", default: { x: 0.3, y: 2.0 } }, // Min/max height in meters
        surfaceTypes: { type: "array", default: ["horizontal"] },   // horizontal, wall, ceiling
        adjustOrientation: { type: "boolean", default: true },      // Orient to surface
        distanceRange: { type: "vec2", default: { x: 0.5, y: 5.0 } }, // Min/max distance from camera
        scale: { type: "number", default: 1.0 }                     // Scale of placed object
    },

    init() {
        this.scene = this.el.sceneEl;
        this.controller = this.scene.renderer.xr.getController(0);
        this.camera = this.scene.camera;

        // Bind methods
        this.onSelect = this.onSelect.bind(this);

        // Add event listener for select event (tap in AR)
        this.controller.addEventListener("select", this.onSelect);

        // const scene = document.querySelector('a-scene');
        // const debugEntity = document.createElement('a-entity');
        // debugEntity.setAttribute('follow-camera', 'angle: 0.001; distance: 1;')
        // debugEntity.setAttribute('text', {
        //     value: 'DEBUG INFO',
        //     color: 'white',
        //     width: 2,
        //     align: 'center'
        // });
        // debugEntity.setAttribute('position', '0 0 -1');
        // debugEntity.setAttribute('look-at', '[camera]');
        // scene.appendChild(debugEntity);
        //
        // debugEntity.setAttribute('text', 'value', 'HELLOOO');
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
            const entityCopy = this.el.cloneNode(true)
            entityCopy.removeAttribute('visible')
            entityCopy.removeAttribute('id')
            entityCopy.removeAttribute('place-object');

            // Set position to hit point
            entityCopy.object3D.position.copy(hitMesh.position);

            // Set orientation based on surface and settings
            if (this.data.adjustOrientation) {
                entityCopy.object3D.quaternion.copy(hitMesh.quaternion);

                // For vertical surfaces, adjust rotation to face outward
                const euler = new THREE.Euler().setFromQuaternion(hitMesh.quaternion);
                if (Math.abs(euler.x - Math.PI/2) < 0.15 || Math.abs(euler.z - Math.PI/2) < 0.15) {
                    // This is a vertical surface, rotate the object to face outward
                    entityCopy.object3D.rotateY(Math.PI);
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

    remove() {
        // Clean up event listeners
        if (this.controller) {
            this.controller.removeEventListener("select", this.onSelect);
        }
    }
});