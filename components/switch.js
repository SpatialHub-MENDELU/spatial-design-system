import * as AFRAME from "aframe"
import { createRoundedRectShape } from "../utils/utils.js"
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"

AFRAME.registerComponent('switch', {
    schema: {
        size: { type: 'string', default: 'medium' },
        value: { type: 'boolean', default: false },
        primary: { type: 'string', default: PRIMARY_COLOR_DARK},
        inset: { type: 'boolean', default: false },
        variant: { type: 'string', default: "" },
        backgroundcolor: { type: 'string', default: VARIANT_DARK_COLOR},
        circlecolor: { type: 'string', default: VARIANT_LIGHT_COLOR},
        
    },
    init() {
        this.setSize()
        this.createSwitch()
        this.setVariant();
        this.addClickEvent();
    },

    update(oldData) {
        // Skip the update for the first time since init() handles the initial setup
        if (!oldData.size) return;
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'value':
                    this.updateValue();
                    break;
                case 'size':
                    this.setSize();
                    this.createSwitch();
                    break;
                case 'primary':
                    this.updateColors();
                    break;
                case 'variant':
                    this.setVariant();
                    break;
                case 'inset':
                    this.createSwitch();
                    break;
                default:
                    break;
            }
        });
    },

    updateValue() {
        // Emitting event to notify of the value change
        this.el.emit('value-changed', { value: this.data.value });

        const circle = this.el.querySelector('a-circle');
        if (this.data.value){
            this.switchMesh.material = this.onMaterial;
            this.shadowMesh.material.color.set(this.data.primary);
            this.shadowMesh.material.opacity = 0.2
            circle.setAttribute('color', this.data.primary);
        } else {
            this.switchMesh.material = this.offMaterial;
            this.shadowMesh.material.color.set(this.data.backgroundcolor);
            this.shadowMesh.material.opacity = 0.6
            circle.setAttribute('color', this.data.circlecolor);
        }
        this.animateCircle();
    },
    
    updateColors() {
        this.onMaterial.color.set(this.data.primary);
        this.offMaterial.color.set(this.data.backgroundcolor);
        this.shadowMesh.material.color.set(this.data.value ? this.data.primary : this.data.backgroundcolor);
        const circle = this.el.querySelector('a-circle');
        circle.setAttribute('color', this.data.value ? this.data.primary : this.data.circlecolor);
    },

    animateCircle() {
        // Animate the circle to the other side of the switch when value changes
        const width = this.width;
        const height = this.height
        const insetCoef = this.insetCoef
        const circle = this.el.querySelector('a-circle');

        circle.setAttribute('animation__position', {
            property: 'position',
            dur: 300,
            easing: 'linear',
            from: circle.getAttribute('position'),
            to: {
                x: this.data.value ? width / (2*insetCoef) - height / 2 : -width / (2*insetCoef) + height / 2,
                y: 0.005,
                z: 0.01
            }
        });
        
        if (!this.data.inset) return
        // Animate the scale of the circle based on the toggle value
        circle.setAttribute('animation__scale', {
            property: 'scale',
            dur: 300,
            easing: 'linear',
            from: {
                x: this.data.value ? 0.6 : 1,
                y: this.data.value ? 0.6 : 1,
                z: this.data.value ? 0.6 : 1
            },
            to: {
                x: this.data.value ? 1 : 0.6,
                y: this.data.value ? 1 : 0.6,
                z: this.data.value ? 1 : 0.6
            }
        });
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
        this.el.setAttribute('sizeCoef', sizeCoef)
    },

    createSwitch() {
        // Remove the old switch circle if it exists
        const oldCircle = this.el.querySelector('a-circle');
        if(oldCircle){
            oldCircle.parentNode.removeChild(oldCircle);
        }

        // Create the rounded background of the switch
        const sizeCoef = this.el.getAttribute("sizeCoef")

        // If the inset is false, have to extend the width, so the scaled element looks good
        const insetCoef = this.data.inset ? 1 : 1.2
        this.insetCoef = insetCoef

        const width = 0.5 * sizeCoef * insetCoef
        const height = 0.22625 * sizeCoef
        const radius = 0.1125 * sizeCoef

        this.width = width;
        this.height = height;
        this.radius = radius;

        const switchShape = createRoundedRectShape(width, height, radius);
        const shadowShape = createRoundedRectShape(width, height, radius);

        const switchGeometry = new AFRAME.THREE.ShapeGeometry(switchShape);
        const shadowGeometry = new AFRAME.THREE.ShapeGeometry(shadowShape);

        const onMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.primary, 
            opacity: 0.4, 
            transparent: true 
        }); 
        const offMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.backgroundcolor 
        }); 
        const shadowMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.value ? this.data.primary : this.data.backgroundcolor, 
            transparent: true, 
            opacity: this.data.value ? 0.2 : 0.6
        });
        
        this.onMaterial = onMaterial;
        this.offMaterial = offMaterial;

        const switchMesh = new AFRAME.THREE.Mesh(
            switchGeometry, this.data.value ? onMaterial : offMaterial
        );
        const shadowMesh = new AFRAME.THREE.Mesh(shadowGeometry, shadowMaterial);
        const moveShadowCoef = width / 36
        shadowMesh.position.set(moveShadowCoef, -moveShadowCoef, -0.01);

        this.switchMesh = switchMesh;
        this.shadowMesh = shadowMesh;

        if (!this.data.inset) {
            switchMesh.scale.set(0.5, 0.5, 0.5)
            shadowMesh.scale.set(0.5, 0.5, 0.5)
        }

        const group = new AFRAME.THREE.Group();
        group.add(switchMesh);
        group.add(shadowMesh);

        this.el.setObject3D('mesh', group);

        // Add a circle that will be moved right or left based on the boolean state
        const circle = document.createElement('a-circle');
        circle.setAttribute('radius', `${height / 2 - height * 0.09}`);
        circle.setAttribute('position', `${!this.data.value ? -width / (2*insetCoef + height) / 2 : width / (2*insetCoef) - height / 2} 0.005 0.01`);
        circle.setAttribute('color', this.data.value ? this.data.primary : this.data.circlecolor);
        circle.setAttribute('scale', this.data.inset && !this.data.value ? '0.6 0.6 0.6' : '1 1 1');

        this.el.appendChild(circle);
    },
    
    addClickEvent() {
        this.el.setAttribute('class', 'clickable')
        this.el.addEventListener('click', () => {
            this.data.value = !this.data.value;
            this.updateValue();
        });
    },

    setVariant() {
        // Switch is the only component using primary color even if variant is set.
        // The primary sets the toggleOn state color

        switch (this.data.variant) {
            case 'light':
                this.data.backgroundcolor = VARIANT_LIGHT_COLOR;
                this.data.circlecolor = VARIANT_DARK_COLOR;
                break;
            case 'dark':
                this.data.backgroundcolor = VARIANT_DARK_COLOR;
                this.data.circlecolor = VARIANT_LIGHT_COLOR
                break;
            default:
                break;
        }
        this.updateColors();
    },
});