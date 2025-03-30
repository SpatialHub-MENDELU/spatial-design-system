import "./ar-placement-utils.js";

AFRAME.registerComponent("place-object", {
    schema: {
        heightRange: { type: "vec2", default: { x: 0.3, y: 2.0 } },     // Min/max height in meters
        surfaceTypes: { type: "array", default: ["horizontal"] },       // horizontal, wall, ceiling
        adjustOrientation: { type: "boolean", default: true },          // Orient to surface
        distanceRange: { type: "vec2", default: { x: 0.5, y: 5.0 } },   // Min/max distance from camera
        scale: { type: "number", default: 1.0 },                        // Scale of placed object
        isPoster: { type: "boolean", default: false },                  // Place object flat on surface
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

        // Check if placement conditions are met using the shared utility
        if (ARPlacementUtils.isSurfaceValid(arHitTestMesh, this.data.surfaceTypes) &&
            ARPlacementUtils.isHeightValid(arHitTestMesh, this.data.heightRange) &&
            ARPlacementUtils.isDistanceValid(arHitTestMesh, this.camera, this.data.distanceRange)) {

            this.createAndPlaceObject(arHitTestMesh);
        }
    },

    async createAndPlaceObject(hitMesh) {
        try {
            // Create a copy of the entity
            const entityCopy = this.el.cloneNode(true);
            entityCopy.setAttribute('visible', true);
            entityCopy.removeAttribute('id');
            entityCopy.removeAttribute('place-object');
            entityCopy.removeAttribute('position');

            // Use the shared placement utility
            ARPlacementUtils.placeObject(entityCopy, hitMesh, {
                isPoster: this.data.isPoster,
                adjustOrientation: this.data.adjustOrientation,
                scale: this.data.scale,
                camera: this.camera
            });

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
