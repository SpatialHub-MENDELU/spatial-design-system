import * as AFRAME from "aframe";

AFRAME.registerComponent('follow-element', {
    schema: {
        place: { type: 'vec3', default: {x: 1, y: 0, z: 0} }, // Values: -1, 0, 1
        offset: { type: 'number', default: 1 },             // Distance from target's border
        target: { type: 'selector' },                         // Target entity to follow
        duration: { type: 'number', default: 0 }            // Animation duration
    },

    init() {
        this.targetEntity = this.data.target;
        if (!this.targetEntity) {
            console.warn('follow-element: No target entity specified');
            return;
        }

        // Initialize vectors
        this.targetPosition = new THREE.Vector3();
        this.targetSize = new THREE.Vector3();
        this.targetBBox = new THREE.Box3();
        this.desiredPosition = new THREE.Vector3();

        // Listen for model-loaded events on target to handle dynamic size changes
        this.onTargetLoaded = this.onTargetLoaded.bind(this);
        this.targetEntity.addEventListener('model-loaded', this.onTargetLoaded);

        // Setup animation component
        this.setupAnimation();
    },

    onTargetLoaded() {
        // Force position update when target model loads
        this.updateTargetBounds();
        this.calculateDesiredPosition();
        this.updatePosition(true); // Force update
    },

    tick() {
        if (!this.targetEntity) return;

        // Update target information
        this.updateTargetBounds();

        // Calculate where we should be positioned
        this.calculateDesiredPosition();

        // Move to new position if needed
        this.updatePosition();
    },

    updateTargetBounds() {
        // Get current target position and size
        this.targetPosition.copy(this.targetEntity.object3D.position);

        // Calculate bounding box
        this.targetBBox.setFromObject(this.targetEntity.object3D);
        this.targetBBox.getSize(this.targetSize);
    },

    calculateDesiredPosition() {
        const halfWidth = this.targetSize.x / 2;
        const halfHeight = this.targetSize.y / 2;
        const halfDepth = this.targetSize.z / 2;

        // Reset desired position to target's position
        this.desiredPosition.copy(this.targetPosition);

        // Apply offset in each direction based on place values
        if (this.data.place.x !== 0) {
            this.desiredPosition.x += this.data.place.x * (halfWidth + this.data.offset);
        }

        if (this.data.place.y !== 0) {
            this.desiredPosition.y += this.data.place.y * (halfHeight + this.data.offset);
        }

        if (this.data.place.z !== 0) {
            this.desiredPosition.z += this.data.place.z * (halfDepth + this.data.offset);
        }
    },

    updatePosition(force = false) {
        const currentPos = this.el.object3D.position;

        // Only animate if position changed significantly or force update
        if (force || currentPos.distanceTo(this.desiredPosition) > 0.01) {
            this.el.setAttribute('animation__follow', {
                to: `${this.desiredPosition.x} ${this.desiredPosition.y} ${this.desiredPosition.z}`
            });
        }
    },

    setupAnimation() {
        this.el.setAttribute('animation__follow', {
            property: 'position',
            to: this.el.object3D.position.x + ' ' +
                this.el.object3D.position.y + ' ' +
                this.el.object3D.position.z,
            dur: this.data.duration,
            easing: 'linear',
            loop: false
        });
    },

    remove() {
        // Clean up event listeners
        if (this.targetEntity) {
            this.targetEntity.removeEventListener('model-loaded', this.onTargetLoaded);
        }

        // Remove animation
        this.el.removeAttribute('animation__follow');
    }
});
