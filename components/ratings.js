import * as AFRAME from "aframe";
import { PRIMARY_COLOR_DARK, PRIMARY_COLOR } from "../utils/colors.js";
import { createStarShape } from "../utils/utils.js";

AFRAME.registerComponent("ratings", {
    schema: {
        size: { type: "string", default: "medium" },
        opacity: { type: "number", default: 1 },
        color: { type: "string", default: PRIMARY_COLOR_DARK }, // Base color (empty stars)
        activecolor: { type: "string", default: PRIMARY_COLOR }, // Active color (filled stars)
        value: { type: "number", default: 3 }, // How many stars are "filled"
        length: { type: "number", default: 5 }, // Total number of stars
        readonly: { type: "boolean", default: false },
        clearable: { type: "boolean", default: true },
    },

    init() {
        this.stars = [];
        this.setSize();
        this.createRatings();

        // Handle Click Interaction
        this.el.addEventListener('click', (evt) => {
            if (this.data.readonly) return;

            // Retrieve the specific mesh that was intersected by the raycaster
            const intersectedObject = evt.detail.intersection.object;
            
            // Check if the intersected object is one of the stars
            if (intersectedObject && intersectedObject.userData.starIndex !== undefined) {
                this.onStarClicked(intersectedObject.userData.starIndex);
            }
        });
    },

    update(oldData) {
        if (!oldData.color) return;

        const changedProperties = Object.keys(this.data).filter(prop => this.data[prop] !== oldData[prop]);

        changedProperties.forEach(property => {
            switch (property) {
                case 'size':
                    this.setSize();
                    this.createRatings();
                    break;
                case 'length':
                    this.createRatings();
                    break;
                case 'value':
                case 'activecolor':
                case 'color':
                    this.updateRatingsColor();
                    break;
                case 'opacity':
                    this.updateRatingsOpacity();
                    break;
            }
        });
    },

    setSize() {
        const sizes = {
            small: { outer: 0.04, inner: 0.02 },
            medium: { outer: 0.07, inner: 0.035 },
            large: { outer: 0.1, inner: 0.05 }
        };
        const selected = sizes[this.data.size] || sizes.medium;
        this.outerRadius = selected.outer;
        this.innerRadius = selected.inner;
    },

    createStarGeometry() {
        const shape = createStarShape(this.outerRadius, this.innerRadius, 5);
        return new THREE.ShapeGeometry(shape);
    },

    createRatings() {
        const group = new AFRAME.THREE.Group();

        // Clear existing star references
        this.stars = [];

        const spacing = this.outerRadius * 2.5;
        const totalWidth = spacing * (this.data.length - 1);
        const startX = -totalWidth / 2;

        for (let i = 0; i < this.data.length; i++) {
            const geometry = this.createStarGeometry();
            const isFilled = i < this.data.value;

            const material = new THREE.MeshBasicMaterial({
                color: isFilled ? this.data.activecolor : this.data.color,
                transparent: true,
                opacity: this.data.opacity,
                side: THREE.DoubleSide
            });

            const starMesh = new THREE.Mesh(geometry, material);
            starMesh.position.x = startX + (i * spacing);
            starMesh.name = `star_${i}`;
            
            // Assign index to userData for identification on click
            starMesh.userData.starIndex = i;

            this.stars.push(starMesh);
            group.add(starMesh);
        }

        // Add clickable class so the raycaster picks it up
        this.el.classList.add("clickable");
        this.el.setObject3D("ratings", group);
    },

    updateRatingsColor() {
        this.stars.forEach((star, i) => {
            const isFilled = i < this.data.value;
            star.material.color.set(isFilled ? this.data.activecolor : this.data.color);
        });
    },

    updateRatingsOpacity() {
        this.stars.forEach(star => {
            star.material.opacity = this.data.opacity;
        });
    },

    onStarClicked(index) {
        // Setting the attribute triggers the update() method automatically
        const newValue = index + 1;
        if (this.data.clearable && this.data.value === newValue) {
            this.el.setAttribute('ratings', 'value', 0);
        } else {
            this.el.setAttribute('ratings', 'value', newValue);
        }

        // Custom event for external listeners
        this.el.emit('rating-changed', { value: newValue });
    },
});
