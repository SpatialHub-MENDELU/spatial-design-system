import * as AFRAME from "aframe"
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
                case 'iconpos':
                case 'rounded':
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
        if (this.chipMesh) {
            this.chipMesh.material.opacity = this.data.outlined && !this.data.textonly && !this.data.elevated ? this.data.opacity * 0.6 : this.data.opacity;
        }
        if (this.outlineMesh) this.outlineMesh.material.opacity = this.data.opacity;
        if (this.shadowMesh) this.shadowMesh.material.opacity = opacityValue * 0.65;
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
            const backgroundColor = new AFRAME.THREE.Color('#808080'); // Assuming gray background = middle between light and dark
            const opacity = this.chipMesh ? this.chipMesh.material.opacity : this.data.opacity * 0.6;
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
        if (contrast <= 120 && !this.data.textonly) {
            const newTextColor = setContrastColor(chipColorHex);

            // Only update and alert if the color actually changes
            if (newTextColor !== textcolor) {
                textcolor = newTextColor;
                console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} for better visibility.`);
            }
        }

        // Update the text element's color
        const textEl = this.el.querySelector("a-text");
        if (textEl) {
            textEl.setAttribute("color", textcolor);
        }
        const iconEl = this.el.querySelector("a-image");
        if (iconEl) {
            iconEl.setAttribute("color", textcolor);
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
            opacityValue = this.data.opacity * 0.6; // Outlined opacity
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
                opacity: this.data.opacity,
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

    _clearContent() {
        const textEl = this.el.querySelector("a-text");
        if (textEl) textEl.remove();
        const iconEl = this.el.querySelector("a-image");
        if (iconEl) iconEl.remove();
    },

    _appendText(value, sizeCoef) {
        const textEl = document.createElement("a-text");
        textEl.setAttribute("value", value === undefined ? "" : value);
        textEl.setAttribute("align", "center");
        textEl.setAttribute('scale', { x: 0.7 * sizeCoef, y: 0.7 * sizeCoef, z: 0.7 * sizeCoef });
        textEl.setAttribute("position", '0 0 0.05');
        textEl.setAttribute("fill-opacity", this.data.opacity);
        this.el.appendChild(textEl);
        return textEl;
    },

    _appendIcon(src, size) {
        const iconEl = document.createElement("a-image");
        iconEl.setAttribute("src", src);
        iconEl.setAttribute("geometry", { width: size, height: size });
        iconEl.setAttribute("position", { x: 0, y: 0, z: 0.02 });
        this.el.appendChild(iconEl);
        return iconEl;
    },

    setContent() {
        this._clearContent();

        const icon = this.data.icon || "";
        const iconpos = this.data.iconpos;
        let text = this.data.label;

        // Ensure the text does not exceed 15 characters
        if (text.length > 15) {
            text = text.substring(0, 12) + "...";
        }

        const sizeCoef = this.el.getAttribute('sizeCoef');

        const letterWidth = 0.08;
        const textWidth = text.length * letterWidth;
        const iconWidth = 0.2;
        const paddingInner = 0.1;
        const paddingOuter = 0.2;

        let widthArg = 0;
        if (icon !== "") {
            widthArg = paddingInner + iconWidth + paddingInner + textWidth + paddingOuter;
        } else {
            widthArg = paddingOuter + textWidth + paddingOuter;
        }
        
        this.createChip(widthArg);

        const textEl = this._appendText(text, sizeCoef);
        let iconEl = null;

        if (icon !== "") {
            const scaledIconWidth = iconWidth * sizeCoef;
            iconEl = this._appendIcon(icon, scaledIconWidth);

            const scaledTextWidth = textWidth * sizeCoef;
            const scaledPaddingInner = paddingInner * sizeCoef;
            const scaledPaddingOuter = paddingOuter * sizeCoef;
            
            let textXPosition;
            let iconXPosition;
            
            if (iconpos === "right") {
                textXPosition = -this.width/2 + scaledPaddingOuter + scaledTextWidth/2;
                iconXPosition = -this.width/2 + scaledPaddingOuter + scaledTextWidth + scaledPaddingInner + scaledIconWidth/2;
            } else {
                iconXPosition = -this.width/2 + scaledPaddingInner + scaledIconWidth/2;
                textXPosition = -this.width/2 + scaledPaddingInner + scaledIconWidth + scaledPaddingInner + scaledTextWidth/2;
            }
            
            textEl.setAttribute("position", { x: textXPosition, y: 0, z: 0.05 });
            iconEl.setAttribute("position", { x: iconXPosition, y: 0, z: 0.02 });
        }

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