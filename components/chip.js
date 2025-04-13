import * as AFRAME from "aframe"
import * as TWEEN from '@tweenjs/tween.js';
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import { createRoundedRectShape, getContrast, setContrastColor} from "../utils/utils.js"

AFRAME.registerComponent("chip", {
    schema: {
        size: { type: "string", default: "medium"},
        opacity: { type: "number", default: 1 },
        color: { type: "string", default: PRIMARY_COLOR_DARK},
        mode: { type: "string", default: ""},
        label: { type: "string", default: "Chip" },
        textcolor: { type: "string", default: "black"},
        icon: { type: "string", default: ""},
        iconpos: { type: "string", default: "left"},
        rounded: { type: "boolean", default: true },
        outlined: { type: 'boolean', default: false },
        elevated: { type: "boolean", default: false },
        textonly: { type: "boolean", default: false },
    },

    init() {
        this.finalColor = this.data.color;
        this.setSize();
        this.setContent();
        this.setMode();
        this.updateChipColor();
    },

    update(oldData) {
        // Skip the update for the first time since init() handles the initial setup
        if (!oldData.color) return;
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'size':
                    this.setSize();
                    this.setContent();
                    break;
                case 'icon':
                case 'rounded':
                case 'closable': // test this later
                    this.setContent();
                    break;
                case 'outlined':
                case 'elevated':
                case 'textonly':
                case 'label':
                    this.setContent();
                    this.updateChipColor();
                    break;
                case 'textcolor':
                    this.updateTextColor(); 
                    break;
                case 'mode':
                    this.setMode();
                    this.updateChipColor();
                    break;
                case 'color':
                    this.updateChipColor();
                    this.updateTextColor();
                    break;
                case 'opacity':
                    this.updateChipOpacity();
                    break;
                case 'iconpos':
                    this.updateIconPosition(this.data.iconpos);
                    break;
                default:
                    break;
            }
        });
    },

    updateChipColor() {
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            this.finalColor = this.data.color;
        } else if (this.data.mode !== "") {
            this.setMode();
        } else {
            this.finalColor = PRIMARY_COLOR_DARK;
            this.updateTextColor();
        }
        this.chipMesh.material.color.set(this.finalColor);
        if (this.shadowMesh) this.shadowMesh.material.color.set(this.finalColor);
        if (this.outlineMesh) this.outlineMesh.material.color.set(this.finalColor);   
    },

    updateChipOpacity() {
        const opacityValue = this.data.textonly ? 0 : this.data.opacity;
        this.chipMesh.material.opacity = opacityValue;
        if (this.shadowMesh) this.shadowMesh.material.opacity = opacityValue * 0.6;
    },

    updateTextColor() {
        // If mode will be used, ignore the textcolor
        if ((this.data.mode === 'light' || this.data.mode === 'dark') 
            && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "") 
            && !this.data.textonly) return;

        let chipColorHex;
        // If the chip is outlined, calculate the lighter color inside color using opacity
        if (this.data.outlined && !this.data.textonly && !this.data.elevated) {
            const borderColor = new AFRAME.THREE.Color(this.data.color);
            const backgroundColor = new AFRAME.THREE.Color('#FFFFFF'); // Assuming white background
            const opacity = 0.05; // Opacity for outlined chips
            const blendedColor = borderColor.clone().lerp(backgroundColor, 1 - opacity);
            chipColorHex = `#${blendedColor.getHexString()}`;
        } else {
            chipColorHex = `#${this.chipMesh.material.color.getHexString()}`;
        }

        let textcolor = this.data.textcolor;

        // Calculate contrast
        const contrast = getContrast(textcolor, chipColorHex);
        
        console.log(`Contrast between ${textcolor} and ${chipColorHex} is: ${contrast}`);

        // If the contrast is not high enough, adjust the text color
        if (contrast <= 60 && !this.data.textonly) {
            const newTextColor = setContrastColor(chipColorHex);

            // Only update and alert if the color actually changes
            if (newTextColor !== textcolor) {
                textcolor = newTextColor;
                this.data.textcolor = textcolor;
                console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} for better visibility.`);
            }
        }

        // Update the text element's color
        const textEl = this.el.querySelector("a-text");
        if (textEl) {
            textEl.setAttribute("color", textcolor);
        }
    },

    updateIconPosition(iconpos) {
        const sizeCoef = this.el.getAttribute('sizeCoef')

        let textEl = this.el.querySelector("a-text")
        let iconEl = this.el.querySelector("a-image")
        if(iconEl) {
            iconEl.remove();
        }

        const icon = this.data.icon === "" ? "" : this.data.icon
        const iconWidth = icon !== "" && !this.data.textonly ? 0.2 * this.el.getAttribute('sizeCoef') : 0

        if(icon !== "" && !this.data.textonly) {
            iconEl = document.createElement("a-image")

            // Have to be loaded like this, otherwise the icon shows error
            // First I have to make sure the image exists before I can use it
            var myImg = new Image;
            myImg.src = icon;
            myImg.onload = () => {
                let textXPosition;
                let iconXPosition;
                if (iconpos === "right") {
                    textXPosition = -iconWidth * 0.5;
                    iconXPosition = this.width * 0.5 - 0.17 * sizeCoef;
                } else {
                    textXPosition = iconWidth * 0.5;
                    iconXPosition = -this.width * 0.5 + 0.18 * sizeCoef;
                }
                
                // Moving the text to the right, so it doesn't hide the icon
                textEl.setAttribute("position", { x: textXPosition, y: 0, z: 0.05 })
                
                iconEl.setAttribute("geometry", { width: iconWidth, height: 0.2 * this.el.getAttribute('sizeCoef')})
                iconEl.setAttribute("position", { x: iconXPosition, y: 0, z: 0.02 })
                iconEl.setAttribute("material", { src: icon })
                this.el.appendChild(iconEl)
            }
        }
    },

    setSize() {
        let sizeCoef = 1
        switch (this.data.size) {
            case "small":
                sizeCoef = 0.7
                break;
            
            case "medium":
                break;

            case "large":
                sizeCoef = 2
                break;
            
            case "extra-large":
                sizeCoef = 3
                break;

            default:
                break
        }
        this.el.setAttribute('sizeCoef',sizeCoef)
    },

    createChip(widthArg = 1, heightArg = 0.4) {
        const sizeCoef = this.el.getAttribute('sizeCoef');
        const group = new AFRAME.THREE.Group();

        const width = widthArg * sizeCoef;
        const height = heightArg * sizeCoef;
        let borderRadius = 0.08 * sizeCoef;

        if (this.data.rounded) {
            borderRadius = 0.2 * sizeCoef;
        }

        this.width = width;

        let opacityValue;
        if (this.data.textonly) {
            opacityValue = 0;
        } else if (this.data.elevated) {
            opacityValue = this.data.opacity; // Elevated takes priority over outlined
        } else if (this.data.outlined) {
            opacityValue = 0.05; // Outlined opacity
        } else {
            opacityValue = this.data.opacity; // Default user-defined opacity
        }

        // Create a main chip mesh
        const chipShape = createRoundedRectShape(width, height, borderRadius);
        const chipGeometry = new AFRAME.THREE.ExtrudeGeometry(
            chipShape,
            { depth: 0.01, bevelEnabled: false }
        );
        if (this.data.outlined && !this.data.textonly && !this.data.elevated) chipGeometry.translate(0, 0, -0.005);

        const chipMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.color, 
            opacity: opacityValue, 
            transparent: true
        });

        const chipMesh = new AFRAME.THREE.Mesh(chipGeometry, chipMaterial);
        this.chipMesh = chipMesh;

        group.add(chipMesh);

        // Create an outline if outlined is true
        if (this.data.outlined && !this.data.textonly && !this.data.elevated) {
            const borderSize = 0.04 * sizeCoef;
            const outlineShape = createRoundedRectShape(width + borderSize, height + borderSize, borderRadius + 0.024);
            const outlineGeometry = new AFRAME.THREE.ShapeGeometry(outlineShape);
            const outlineMaterial = new AFRAME.THREE.MeshBasicMaterial({
                color: this.data.color,
                opacity: 0.5,
                transparent: true
            });
            const outlineMesh = new AFRAME.THREE.Mesh(outlineGeometry, outlineMaterial);
            outlineMesh.position.z -= 0.05;

            this.outlineMesh = outlineMesh;
            group.add(outlineMesh);
        }

        // Create a shadow if elevated is true
        if (this.data.elevated) { 
            const shadowGeometry = new AFRAME.THREE.ShapeGeometry(chipShape);
            const shadowMaterial = new AFRAME.THREE.MeshBasicMaterial({
                color: this.data.color,
                opacity: 0.65 * opacityValue,
                transparent: true
            });
            const shadowMesh = new AFRAME.THREE.Mesh(shadowGeometry, shadowMaterial);
            const moveChipCoef = width / 36;
            shadowMesh.position.set(moveChipCoef, -moveChipCoef, -0.01);
            this.shadowMesh = shadowMesh;
            group.add(shadowMesh);
        }

        this.el.setObject3D('mesh', group);
    },

    setContent() {
        const icon = this.data.icon === "" ? "" : this.data.icon;
        const iconpos = this.data.iconpos;
        let text = this.data.label;

        // Ensure the text does not exceed 15 characters
        if (text.length > 15) {
            text = text.substring(0, 12) + "...";
        }

        const sizeCoef = this.el.getAttribute('sizeCoef');

        let textEl = this.el.querySelector("a-text");
        if (textEl) textEl.remove();

        textEl = document.createElement("a-text");
        textEl.setAttribute("value", text === undefined ? "" : text);
        textEl.setAttribute("align", "center");
        textEl.setAttribute('scale', { x: 0.7 * sizeCoef, y: 0.7 * sizeCoef, z: 0.7 * sizeCoef });
        textEl.setAttribute("position", '0 0 0.05');

        // If there is an icon, the button has to be wider
        const iconWidth = icon !== "" && !this.data.textonly ? 0.2 * this.el.getAttribute('sizeCoef') : 0;

        // If the text is longer than 8 chars, the button has to be wider
        // Have to create a new button, if using button.scale.set(), the border radius will not scale
        const defaultLetterWidth = 0.08;
        this.createChip(0.9 + defaultLetterWidth * (text.length - 8) + iconWidth * 0.7);

        this.el.appendChild(textEl);

        this.updateIconPosition(iconpos);
        this.updateTextColor();
    },

    setMode() {
        const shadowMesh = this.shadowMesh;
        // If color is set, or textonly is true, skip applying the mode
        if ((this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") || this.data.textonly) {
            return;
        }
        switch (this.data.mode) {
            case "light":
                this.el.setAttribute("material", { color: VARIANT_LIGHT_COLOR, opacity: 1 });
                this.el.querySelector("a-text").setAttribute("color", "black");
                this.finalColor = VARIANT_LIGHT_COLOR;
                if (shadowMesh) {
                    shadowMesh.material.color.set(VARIANT_LIGHT_COLOR);
                    shadowMesh.material.opacity = 0.65;
                    shadowMesh.material.transparent = true;
                }
                break;
            case "dark":
                this.el.setAttribute("material", { color: VARIANT_DARK_COLOR, opacity: 1 });
                this.el.querySelector("a-text").setAttribute("color", "white");
                this.finalColor = VARIANT_DARK_COLOR;
                if (shadowMesh) {
                    shadowMesh.material.color.set(VARIANT_DARK_COLOR);
                    shadowMesh.material.opacity = 0.65;
                    shadowMesh.material.transparent = true;
                }
                if (this.data.outlined && !this.data.textonly && !this.data.elevated) {
                    this.el.querySelector("a-text").setAttribute("color", VARIANT_DARK_COLOR);
                }
                break;
            default:
                break;
        }
    },

});