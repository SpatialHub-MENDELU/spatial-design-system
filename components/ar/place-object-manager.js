AFRAME.registerComponent("place-object-manager", {
    schema: {
        enabled: { type: "boolean", default: true },
        maxObjects: { type: "number", default: 10 },
        defaultHeightRange: { type: "vec2", default: { x: 0.3, y: 2.0 } },
        defaultSurfaceTypes: { type: "array", default: ["horizontal"] },
        defaultDistanceRange: { type: "vec2", default: { x: 0.5, y: 5.0 } },
        showHitTestMarker: { type: "boolean", default: true }
    },

    init() {
        this.scene = this.el.sceneEl;
        this.placedObjects = [];

        // Create hit test marker (optional visualization)
        if (this.data.showHitTestMarker) {
            this.createHitTestMarker();
        }

        // Enable AR hit test
        this.scene.setAttribute("ar-hit-test", "mapSize: 0.1 0.1");

        // Listen for placed objects
        this.el.addEventListener("object-placed", this.onObjectPlaced.bind(this));
    },

    createHitTestMarker() {
        // Create a simple circular marker to show where objects will be placed
        const marker = document.createElement("a-entity");
        marker.setAttribute("geometry", "primitive: ring; radiusInner: 0.04; radiusOuter: 0.05");
        marker.setAttribute("material", "color: white; opacity: 0.5; transparent: true");
        marker.setAttribute("id", "hit-test-marker");
        marker.setAttribute("visible", false);
        this.scene.appendChild(marker);

        this.hitTestMarker = marker;

        // Update marker position on AR hit test
        this.scene.addEventListener("ar-hit-test-ready", () => {
            this.scene.addEventListener("ar-hit-test-update", (e) => {
                if (this.data.enabled && this.hitTestMarker) {
                    const hitPoint = e.detail.position;
                    this.hitTestMarker.setAttribute("position", hitPoint);
                    this.hitTestMarker.setAttribute("visible", true);

                    // Orient to surface
                    if (e.detail.orientation) {
                        this.hitTestMarker.setAttribute("rotation", {
                            x: THREE.MathUtils.radToDeg(e.detail.orientation.x),
                            y: THREE.MathUtils.radToDeg(e.detail.orientation.y),
                            z: THREE.MathUtils.radToDeg(e.detail.orientation.z)
                        });
                    }
                }
            });
        });
    },

    onObjectPlaced(event) {
        const placedEntity = event.detail.entity;

        // Add to our list of placed objects
        this.placedObjects.push(placedEntity);

        // Check if we've reached the maximum
        if (this.placedObjects.length >= this.data.maxObjects) {
            // Disable further placement
            this.data.enabled = false;
            console.log("Maximum number of objects placed");
        }

        // Emit our own event that can be caught by application code
        this.el.emit("object-managed", {
            action: "placed",
            entity: placedEntity,
            totalObjects: this.placedObjects.length
        });
    },

    removeAllObjects() {
        // Remove all placed objects
        this.placedObjects.forEach(obj => {
            if (obj.parentNode) {
                obj.parentNode.removeChild(obj);
            }
        });

        this.placedObjects = [];
        this.data.enabled = true;

        // Emit event
        this.el.emit("object-managed", {
            action: "cleared",
            totalObjects: 0
        });
    },

    removeLastObject() {
        if (this.placedObjects.length > 0) {
            const lastObject = this.placedObjects.pop();

            if (lastObject.parentNode) {
                lastObject.parentNode.removeChild(lastObject);
            }

            // Re-enable placement if we were at max
            if (!this.data.enabled && this.placedObjects.length < this.data.maxObjects) {
                this.data.enabled = true;
            }

            // Emit event
            this.el.emit("object-managed", {
                action: "removed",
                entity: lastObject,
                totalObjects: this.placedObjects.length
            });
        }
    },

    update(oldData) {
        // React to changes in the component properties
        if (oldData.showHitTestMarker !== undefined &&
            this.data.showHitTestMarker !== oldData.showHitTestMarker) {
            if (this.hitTestMarker) {
                this.hitTestMarker.setAttribute("visible", this.data.showHitTestMarker);
            }
        }
    },

    remove() {
        // Clean up
        if (this.hitTestMarker && this.hitTestMarker.parentNode) {
            this.hitTestMarker.parentNode.removeChild(this.hitTestMarker);
        }

        // Remove all placed objects
        this.removeAllObjects();
    }
});