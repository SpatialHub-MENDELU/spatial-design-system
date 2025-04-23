import "./ar-placement-utils.js";
import { PLACE_OBJECT_COMPONENT_NAME } from "./place-object";

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
        this.camera = this.scene.camera;

        // Enable AR hit test
        this.scene.setAttribute("webxr", {
            optionalFeatures: 'hit-test',
            referenceSpaceType: 'local-floor'
        });

        // turn off default hit-test-marker
        this.scene.setAttribute('ar-hit-test', {
            mapSize: {x: 0, y: 0}
        })

        this.scene.setAttribute('xr-mode-ui', {
            XRMode: 'ar'
        })

        this.createHitTestMarker()

        // Event listeners
        this.scene.addEventListener('ar-hit-test-achieved', this.updateMarkerPosition.bind(this))

        // Listen for placed objects
        this.el.addEventListener("object-placed", this.onObjectPlaced.bind(this));
    },

    tick() {
        if (!this.hitTestMarker || !this.scene.components['ar-hit-test']){
            return;
        }

        if(this.data.showHitTestMarker) {
            this.updateHitTestMarkerPosition()
        }

        if (this.data.showPreview) {
            this.updatePreviewObjectPosition()
        }
    },

    updatePreviewObjectPosition() {
        const objectToPlace = this.scene.querySelector(`[${PLACE_OBJECT_COMPONENT_NAME}]`);
        if (!objectToPlace) {
            return;
        }

        const hitTest = this.scene.components['ar-hit-test'];

        if (!hitTest.bboxMesh) {
            return;
        }

        // Get or create the preview object
        let previewObject = document.getElementById('place-object-preview');
        if (!previewObject) {
            previewObject = this.createObjectGhostCopy(objectToPlace);
        }

        // Reset preview object's transformation before applying new one
        previewObject.object3D.position.set(0, 0, 0);
        previewObject.object3D.rotation.set(0, 0, 0);
        previewObject.object3D.quaternion.identity();
        previewObject.object3D.scale.set(1, 1, 1);

        // Get configuration from the place-object component
        const placeObjectComponent = objectToPlace.components[PLACE_OBJECT_COMPONENT_NAME];
        if (placeObjectComponent) {
            // Use the shared placement utility for consistent preview
            ARPlacementUtils.placeObject(previewObject, hitTest.bboxMesh, {
                isPoster: placeObjectComponent.data.isPoster,
                adjustOrientation: placeObjectComponent.data.adjustOrientation,
                faceCamera: placeObjectComponent.data.faceCamera,
                customRotation: placeObjectComponent.data.customRotation,
                scale: placeObjectComponent.data.scale,
                camera: this.camera
            });
        } else {
            // Default fallback if no place-object component is found
            ARPlacementUtils.placeObject(previewObject, hitTest.bboxMesh, {
                scale: 0.1,
                camera: this.camera
            });
        }
    },

    updateHitTestMarkerPosition() {
        if (
            !this.hitTestMarker?.object3D
            || !this.scene.components['ar-hit-test']
        ){
            return;
        }

        const hitTest = this.scene.components['ar-hit-test'];

        if (!hitTest.bboxMesh) {
            return;
        }

        // Always copy the position from the hit test
        this.hitTestMarker.object3D.position.copy(hitTest.bboxMesh.position);

        // The issue is that the marker's children (ring and dot) need special handling
        // First, let's identify the elements
        const ring = this.hitTestMarker.querySelector('a-entity[geometry^="primitive: ring"]');
        const dot = this.hitTestMarker.querySelector('a-circle');

        // Copy quaternion from hit test mesh
        this.hitTestMarker.object3D.quaternion.copy(hitTest.bboxMesh.quaternion);

        // Create adjustment rotation (-90 degrees around X-axis) to lay flat on the surface
        // This is needed because the ring geometry in A-Frame is initially in the XY plane
        const adjustRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
        this.hitTestMarker.object3D.quaternion.multiply(adjustRotation);
    },

    createObjectGhostCopy(el) {
        const entityCopy = el.cloneNode(true);
        entityCopy.removeAttribute('visible');
        entityCopy.removeAttribute('id');
        entityCopy.removeAttribute(PLACE_OBJECT_COMPONENT_NAME);
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

        // Reset any transformations that might have been cloned
        entityCopy.object3D.position.set(0, 0, 0);
        entityCopy.object3D.rotation.set(0, 0, 0);
        entityCopy.object3D.quaternion.identity();
        entityCopy.object3D.scale.set(1, 1, 1);

        this.scene.appendChild(entityCopy);
        return entityCopy;
    },

    createHitTestMarker() {
        if(!this.data.showHitTestMarker) {
            return;
        }

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
        marker.setAttribute('scale', '0.3 0.3 0.3');

        // Outer ring - must be a child directly to properly inherit transformations
        const outerRing = document.createElement('a-entity');
        outerRing.setAttribute('geometry', 'primitive: ring; radiusInner: 0.06; radiusOuter: 0.1; segments-theta: 64');
        outerRing.setAttribute('material', `color: ${MARKER_COLOR}; opacity: 0.8; side: double`);

        // Central dot - ensure it's slightly offset to avoid Z-fighting
        const centerDot = document.createElement('a-circle');
        centerDot.setAttribute('radius', 0.02);
        centerDot.setAttribute('color', MARKER_COLOR);
        centerDot.setAttribute('material', 'opacity: 0.9; side: double');
        centerDot.setAttribute('position', '0 0 0.001'); // Small Z-offset to prevent z-fighting

        // Add children to marker
        marker.appendChild(outerRing);
        marker.appendChild(centerDot);

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
            // Disable further placement - use setAttribute instead of direct assignment
            this.removeLastObject()
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
                this.el.setAttribute('place-object-manager', 'enabled', true);
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

        // Remove preview object if it exists
        const previewObject = document.getElementById('place-object-preview');
        if (previewObject && previewObject.parentNode) {
            previewObject.parentNode.removeChild(previewObject);
        }

        // Remove all placed objects
        this.removeAllObjects();
    }
});