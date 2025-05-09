import * as AFRAME from "aframe"
import { VARIANT_DARK_COLOR } from "../utils/colors.js"
import { createRoundedRectShape } from "../utils/utils.js"

AFRAME.registerComponent("divider", {
    schema: {
        opacity: { type: "number", default: 1 },
        color: { type: "string", default: VARIANT_DARK_COLOR },
        length: { type: "string", default: "medium" },
        thickness: { type: "number", default: 0 },
        vertical: { type: "boolean", default: false },
    },

    init() {
        this.setSize();
    },

    update(oldData) {
        // Skip the update for the first time since init() handles the initial setup
        if (!oldData.color) return;
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'opacity':
                    this.updateDividerOpacity();
                    break;
                case 'color':
                    this.updateDividerColor();
                    break;
                case 'length':
                    this.setSize();
                    break;
                case 'thickness':
                    this.createDivider();
                    break;
                case 'vertical':
                    this.rotateDivider();
                    break;
                default:
                    break;
            }
        });
    },

    updateDividerColor() {
        this.dividerMesh.material.color.set(this.data.color);  
    },

    updateDividerOpacity() {
        this.dividerMesh.material.opacity = this.data.opacity;
    },

    setSize() {
        let lengthCoef = 1.2;
        let heightCoef = 0.003;
        let customWidth = null;

        switch (this.data.length) {
            case "small":
                lengthCoef = 1;
                heightCoef = 0.001;
                break;
            case "medium":
                break;
            case "large":
                lengthCoef = 1.4;
                heightCoef = 0.005;
                break;
            default:
                const parsedLength = parseFloat(this.data.length);
                if (!isNaN(parsedLength)) {
                    customWidth = parsedLength; // Store the custom width value
                } else {
                    console.warn(`Invalid length value: ${this.data.length}`);
                }
                break;
        }

        this.lengthCoef = lengthCoef;
        this.customWidth = customWidth;
        this.heightCoef = heightCoef; 
        this.createDivider();
    },

    createDivider() {
        const lengthCoef = this.lengthCoef;
        const heightCoef = this.heightCoef;
        const group = new AFRAME.THREE.Group();

        const width = this.customWidth !== null && this.customWidth > 0 ? this.customWidth : lengthCoef; // When length is set apply it as component's width
        const height = this.data.thickness > 0 ? this.data.thickness : heightCoef; // When thickness is set apply it (ensure the number is not negative or zero)

        this.width = width;
        const borderRadius = 0;
        const opacityValue = this.data.opacity;

        // Create a main divider mesh
        const dividerShape = createRoundedRectShape(width, height, borderRadius);
        const dividerGeometry = new AFRAME.THREE.ExtrudeGeometry(
            dividerShape,
            { depth: 0.01, bevelEnabled: false }
        );

        const dividerMaterial = new AFRAME.THREE.MeshBasicMaterial({
            color: this.data.color,
            opacity: opacityValue,
            transparent: true,
        });

        const dividerMesh = new AFRAME.THREE.Mesh(dividerGeometry, dividerMaterial);
        this.dividerMesh = dividerMesh;

        group.add(dividerMesh);

        this.el.setObject3D("mesh", group);

        if (this.data.vertical) {
            this.rotateDivider();
        }
    },

    rotateDivider() {
        if (this.data.vertical) {
            this.dividerMesh.rotation.z = Math.PI / 2; // Rotate to vertical
        } else {
            this.dividerMesh.rotation.z = 0; // Reset to horizontal
        }
    }
});
