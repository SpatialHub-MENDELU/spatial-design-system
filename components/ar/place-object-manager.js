import "./ar-placement-utils.js";

AFRAME.registerComponent("place-object-manager", {
    schema: {
        enabled: { type: "boolean", default: true },
        maxObjects: { type: "number", default: 10 },
        showHitTestMarker: { type: "boolean", default: true },
        hitTestMarker: { type: "string", default: "#ar-hit-test-marker"},
        showPreview: { type: "boolean", default: true }, // Show preview of object before placing
    },

    init() {
        this.scene = this.el.sceneEl;
        this.placedObjects = [];
        this.hitTestMarker = null;

        // Enable AR hit test
        this.scene.setAttribute("webxr", {
            optionalFeatures: 'hit-test',
            referenceSpaceType: 'local-floor'
        });

        this.createHitTestMarker()

        // Event listeners
        this.scene.addEventListener('ar-hit-test-achieved', this.updateMarkerPosition.bind(this))

        // Listen for placed objects
        this.el.addEventListener("object-placed", this.onObjectPlaced.bind(this));
    },

// In place-object-manager.js
    tick() {
        if (!this.hitTestMarker || !this.scene.components['ar-hit-test']) return;

        const hitTest = this.scene.components['ar-hit-test'];
        if (hitTest.bboxMesh && this.hitTestMarker.object3D) {
            this.hitTestMarker.object3D.position.copy(hitTest.bboxMesh.position);
            this.hitTestMarker.object3D.quaternion.copy(hitTest.bboxMesh.quaternion);
        }

        // Create adjustment rotation (-90 degrees around X-axis)
        const adjustRotation = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));

        // Combine hit-test rotation with adjustment
        this.hitTestMarker.object3D.quaternion
            .copy(hitTest.bboxMesh.quaternion)
            .multiply(adjustRotation);

        // Show preview if enabled
        if (this.data.showPreview) {
            const objectToPlace = this.scene.querySelector('[place-object]');
            if (!objectToPlace) return;

            // Get or create the preview object
            const previewObject = document.getElementById('place-object-preview') ||
                this.createObjectGhostCopy(objectToPlace);

            // Get configuration from the place-object component
            const placeObjectComp = objectToPlace.components['place-object'];
            if (placeObjectComp) {
                // Use the shared placement utility for consistent preview
                ARPlacementUtils.placeObject(previewObject, hitTest.bboxMesh, {
                    isPoster: placeObjectComp.data.isPoster,
                    adjustOrientation: placeObjectComp.data.adjustOrientation,
                    scale: placeObjectComp.data.scale,
                    camera: this.camera
                });
            } else {
                // Default fallback if no place-object component is found
                ARPlacementUtils.placeObject(previewObject, hitTest.bboxMesh, {
                    scale: 0.1,
                    camera: this.camera
                });
            }
        }
    },

    createObjectGhostCopy(el) {
        const entityCopy = el.cloneNode(true);
        entityCopy.removeAttribute('visible');
        entityCopy.removeAttribute('id');
        entityCopy.removeAttribute('place-object');
        entityCopy.setAttribute('id', 'place-object-preview');
        entityCopy.setAttribute('visible', true);

        // Make the preview semi-transparent
        const materials = entityCopy.querySelectorAll('[material]');
        if (materials.length > 0) {
            materials.forEach(mat => {
                const matData = mat.getAttribute('material');
                mat.setAttribute('material', Object.assign({}, matData, { opacity: 0.5 }));
            });
        } else {
            entityCopy.setAttribute('material', 'opacity: 0.5');
        }

        this.scene.appendChild(entityCopy);
        return entityCopy;
    },


    createHitTestMarker() {
        // Check if marker already exists in DOM
        const doesMarkerExist = document.querySelector(this.data.hitTestMarker);
        if(doesMarkerExist) {
            this.hitTestMarker = doesMarkerExist;
            return;
        }

        // Use 3D object instead of 2D circle for better AR visibility
        const MARKER_COLOR = '#ff0000'

        const marker = document.createElement('a-entity');
        marker.setAttribute('visible', true);
        marker.setAttribute('position', '0 0 0');

        const outerRing = document.createElement('a-entity');
        outerRing.setAttribute('geometry', 'primitive: ring; radiusInner: 0.06; radiusOuter: 0.1');
        outerRing.setAttribute('material', `color: ${MARKER_COLOR}; opacity: 0.8`);
        marker.setAttribute('rotation', '0 -90 0');

        // Central dot
        const centerDot = document.createElement('a-circle');
        centerDot.setAttribute('radius', 0.02);
        centerDot.setAttribute('color', MARKER_COLOR);
        centerDot.setAttribute('material', 'opacity: 0.9; side: double');
        centerDot.setAttribute('position', '0 0.001 0'); // Z-offset to prevent z-fighting

        marker.setAttribute('scale', '0.3 0.3 0.3');

        marker.appendChild(outerRing);
        marker.appendChild(centerDot);

        this.scene.appendChild(marker);
        this.hitTestMarker = marker;
    },

    csreateHitTestMarker() {
        // Create parent entity
        const marker = document.createElement('a-entity');
        marker.setAttribute('visible', false);
        marker.setAttribute('position', '0 0 0');

        // Outer ring (main circle)
        const outerRing = document.createElement('a-ring');
        outerRing.setAttribute('radius-inner', 0.12);  // Width of the ring
        outerRing.setAttribute('radius-outer', 0.2);
        outerRing.setAttribute('color', '#ff0000');
        outerRing.setAttribute('material', 'opacity: 0.8; side: double');
        outerRing.setAttribute('rotation', '-90 0 0');

        // Central dot
        const centerDot = document.createElement('a-circle');
        centerDot.setAttribute('radius', 0.03);
        centerDot.setAttribute('color', '#ff0000');
        centerDot.setAttribute('material', 'opacity: 0.9; side: double');
        centerDot.setAttribute('position', '0 0.001 0'); // Z-offset to prevent z-fighting

        // Add children to marker
        marker.appendChild(outerRing);
        marker.appendChild(centerDot);

        // Add subtle animation
        marker.setAttribute('animation', `
        property: scale;
        dur: 1200;
        loop: true;
        from: 0.9 0.9 0.9;
        to: 1.1 1.1 1.1;
        easing: easeInOutQuad
    `);

        this.scene.appendChild(marker);
        this.hitTestMarker = marker;
    },

    updateMarkerPosition(evt) {
        if (!this.hitTestMarker || !this.data.enabled) return;

        const hitPose = evt.detail.position;
        const orientation = evt.detail.orientation;

        if (hitPose) {
            this.hitTestMarker.setAttribute('position', hitPose);
            this.hitTestMarker.setAttribute('visible', true);
        }

        if (orientation) {
            // Use quaternion directly for more accurate rotation
            this.hitTestMarker.object3D.quaternion.copy(orientation);

            // Additional adjustment for vertical surfaces
            const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
            if (Math.abs(normal.y) < 0.9) { // Vertical surface check
                this.hitTestMarker.object3D.rotation.y += Math.PI;
            }
        }
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