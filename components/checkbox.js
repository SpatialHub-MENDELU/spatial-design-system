import * as AFRAME from 'aframe';
import { createRoundedSquareShape, setContrastColor } from '../utils/utils.js';
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"


AFRAME.registerComponent('checkbox', {
    schema: {
        value: { type: 'boolean', default: false },
        size: { type: 'string', default: "medium" },
        variant: { type: 'string', default: "" },
        primary: { type: 'string', default: PRIMARY_COLOR_DARK},
        checkmarkcolor: { type: 'string', default: 'white'},
        bordercolor: { type: 'string', default: VARIANT_DARK_COLOR },
        backgroundcolor: { type: 'string', default: VARIANT_LIGHT_COLOR}

    },
  
    init() {
        this.setSize()
        this.createCheckbox();
        this.setVariant()
        this.setClick()
        this.updateValue();
      },

    update(oldData) {
        // Skip the update for the first time since init() handles the initial setup
        if (!oldData.primary) return;

        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'value':
                    this.updateValue();
                    break;
                case 'size':
                    this.setSize();
                    this.createCheckbox();
                    break;
                case 'variant':
                    this.setVariant();
                    break;
                case 'primary':
                    this.updateColors();
                default:
                    break;
            }
        });
    },
    
    updateValue() {
        // Emitting event to notify of the value change
        this.el.emit('value-changed', { value: this.data.value });

        if (this.checkmarkMesh) {
            // Set the visibility of the checkmark
            this.checkmarkMesh.visible = this.data.value;
        }
        if (this.data.value) {
            this.checkboxMesh.material.color.set(this.data.primary);
            this.borderMesh.material.color.set(this.data.primary);
            this.shadowMesh.material.color.set(this.data.primary);
        } else {
            this.checkboxMesh.material.color.set(this.data.backgroundcolor);
            this.borderMesh.material.color.set(this.data.bordercolor);
            this.shadowMesh.material.color.set(this.data.bordercolor);
        }
    },
    
    updateColors() {
        // Set the checkmark color to white or black depending on the contrast with the primary color
        this.data.checkmarkcolor = setContrastColor(this.data.primary);
        
        this.data.checkmarkcolor === 'black' ? this.data.checkmarkcolor = VARIANT_DARK_COLOR : null;

        this.checkboxMesh.material.color.set(this.data.backgroundcolor);
        this.borderMesh.material.color.set(this.data.bordercolor);
        this.shadowMesh.material.color.set(this.data.bordercolor);
        this.checkmarkMesh.material.color.set(this.data.checkmarkcolor);
    },

    setSize() {
        let sizeCoef = 1
        switch (this.data.size) {
            case 'small':
                sizeCoef = 0.5
                break;
            case 'medium':
                break;
            case 'large':
                sizeCoef = 1.5
                break;
            case 'extra-large':
                sizeCoef = 2
                break;
            default:
                break;
        }
        this.el.setAttribute('sizeCoef',sizeCoef)
    },
  
    createCheckbox() {
        // Setting a boolean value of the checkbox
        this.el.setAttribute('value', this.data.value);

        const sizeCoef = this.el.getAttribute('sizeCoef')

        const size = 0.125 * sizeCoef;
        const borderRadius = 0.066 * sizeCoef;
        const borderSize = 0.020 * sizeCoef;

        const checkboxShape = createRoundedSquareShape(size, borderRadius);
        const borderShape = createRoundedSquareShape(size + borderSize, borderRadius + borderSize);
        const shadowShape = createRoundedSquareShape(size + borderSize, borderRadius + borderSize);

        const borderGeometry = new AFRAME.THREE.ExtrudeGeometry(
            borderShape,
            { depth: 0, bevelEnabled: false }
        );
        const checkboxGeometry = new AFRAME.THREE.ExtrudeGeometry(
            checkboxShape,
            { depth: 0.01, bevelEnabled: false }
        );

        const shadowGeometry = new AFRAME.THREE.ShapeGeometry(shadowShape);

        checkboxGeometry.translate(0, 0, -0.005);

        const checkboxMaterial = new AFRAME.THREE.MeshBasicMaterial({ color: this.data.value ? this.data.primary : this.data.backgroundcolor });
        const borderMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.value ? this.data.primary : this.data.bordercolor  
        });
        const shadowMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.value ? this.data.primary : this.data.bordercolor, 
            transparent: true, 
            opacity: 0.5
        });

        const createCheckmarkShape = () => {
            const shape = new AFRAME.THREE.Shape();
            const scale = size * 2.3; 
            shape.moveTo(-scale * 0.41, scale * 0.1);
            shape.lineTo(-scale * 0.2, -scale * 0.2);
            shape.lineTo(scale * 0.31, scale * 0.29);
            shape.lineTo(scale * 0.2, scale * 0.4);
            shape.lineTo(-scale * 0.18, scale * 0.02);
            shape.lineTo(-scale * 0.295, scale * 0.185);
            shape.closePath();
            return shape;
        };

        const checkmarkShape = createCheckmarkShape();
        const checkmarkGeometry = new AFRAME.THREE.ExtrudeGeometry(checkmarkShape, { depth: 0.01, bevelEnabled: false });
         // Adjust checkmark to be centered in the checkbox
        checkmarkGeometry.translate(size / 6, -size / 5, 0.006);

        const checkmarkMaterial = new AFRAME.THREE.MeshBasicMaterial({ color: this.data.checkmarkcolor });
        const checkmarkMesh = new AFRAME.THREE.Mesh(checkmarkGeometry, checkmarkMaterial);
        checkmarkMesh.visible = this.data.value;
        this.checkmarkMesh = checkmarkMesh

        const borderMesh = new AFRAME.THREE.Mesh(borderGeometry, borderMaterial);
        const checkboxMesh = new AFRAME.THREE.Mesh(checkboxGeometry, checkboxMaterial);
        const shadowMesh = new AFRAME.THREE.Mesh(shadowGeometry, shadowMaterial);
        const moveShadowCoef = size / 5
        shadowMesh.position.set(moveShadowCoef, -moveShadowCoef, -0.01);

        this.checkboxMesh = checkboxMesh;
        this.borderMesh = borderMesh;
        this.shadowMesh = shadowMesh;

        const group = new AFRAME.THREE.Group();
        group.add(borderMesh);
        group.add(checkboxMesh);
        group.add(shadowMesh);
        group.add(checkmarkMesh);

        this.el.setObject3D('mesh', group);
        
        // Update colors to adjust the checkmark color
        this.updateColors();
    },

    setClick() {
        this.el.setAttribute('class', 'clickable')
        this.el.addEventListener('click', () => {
            this.data.value = !this.data.value;
            this.updateValue();
        });
    },

    setVariant() {
        //If primary is set gnore the variant
        if (this.data.primary !== PRIMARY_COLOR_DARK) return;

        switch (this.data.variant) {
            case 'light':
                this.data.primary = VARIANT_LIGHT_COLOR;
                this.data.bordercolor = VARIANT_LIGHT_COLOR;
                this.data.backgroundcolor = VARIANT_DARK_COLOR;
                this.data.checkmarkcolor = VARIANT_DARK_COLOR;
                break;
            case 'dark':
                this.data.primary = VARIANT_DARK_COLOR;
                this.data.bordercolor = VARIANT_DARK_COLOR;
                this.data.backgroundcolor = VARIANT_LIGHT_COLOR;
                this.data.checkmarkcolor = 'white';
                break;
            default:
                // Calling updateColors to decide the right checkmark color
                break;
        }
        this.updateColors();
    },
  });