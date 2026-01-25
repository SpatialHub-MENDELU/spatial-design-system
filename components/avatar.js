import "aframe-troika-text";
import * as AFRAME from "aframe"
import { PRIMARY_COLOR_DARK } from "../utils/colors.js"
import { createCircleShape, createRoundedSquareShape, getContrast, setContrastColor} from "../utils/utils.js"

AFRAME.registerComponent("avatar", {
    schema: {
        size: { type: "string", default: "medium"},
        opacity: { type: "number", default: 1 },
        color: { type: "string", default: PRIMARY_COLOR_DARK},
        textcolor: { type: "string", default: "white"},
        initial: { type: "string", default: "" },
        image: { type: "string", default: ""},
        tile: { type: "boolean", default: false },
        rounded: { type: "string", default: "" },
    },

    init() {
        this.setSize();
        this.setBorderRadius();
        this.setContent();
    },

    update(oldData) {
        // Skip the update for the first time since init() handles the initial setup
        if (!oldData || Object.keys(oldData).length === 0) return;
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'size':
                    this.setSize();
                    this.setContent();
                    break;
                case 'opacity':
                    this.updateAvatarOpacity();
                    break;
                case 'color':
                    this.updateAvatarColor();
                    break;
                case 'textcolor':
                    this.updateTextColor(); 
                    break;
                case 'initial':
                case 'image':
                    this.setContent();
                    break;
                case 'tile':
                case 'rounded':
                    this.setBorderRadius();
                    this.createAvatar();
                    break;
                default:
                    break;
            }
        });
    },

    updateAvatarColor() {
        if (!this.avatarMesh || !this.avatarMesh.material) return;
        this.avatarMesh.material.color.set(this.data.color);
        this.updateTextColor();
    },

    updateAvatarOpacity() {
        if (!this.avatarMesh || !this.avatarMesh.material) return;
        this.avatarMesh.material.opacity = this.data.opacity;
    },

    updateTextColor() {
        if (!this.avatarMesh || !this.avatarMesh.material) return;
        const avatarColorHex = `#${this.avatarMesh.material.color.getHexString()}`;
        let textcolor = this.data.textcolor || "white";

        // Calculate contrast and adjust if needed
        const contrast = getContrast(textcolor, avatarColorHex);
        if (contrast <= 60) {
            const newTextColor = setContrastColor(avatarColorHex);
            if (newTextColor && newTextColor !== textcolor) {
                textcolor = newTextColor;
                console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} for better visibility.`);
            }
        }

        const textEl = this.el.querySelector("a-troika-text");
        if (textEl) textEl.setAttribute("color", textcolor);
    },

    setSize() {
        switch (this.data.size) {
            case "small": this.sizeCoef = 0.06; break;
            case "large": this.sizeCoef = 0.09; break;
            case "medium":
            default: this.sizeCoef = 0.075; break;
        }
    },

    setBorderRadius() {
        let borderRadius = 0;

        switch (this.data.rounded) {
            case "sm": borderRadius = 0.02; break;
            case "md": borderRadius = 0.04; break;
            case "lg": borderRadius = 0.06; break;
            default: borderRadius = 0; break;
        }
        this.borderRadius = borderRadius;
    },

    createAvatar() {
        const group = new AFRAME.THREE.Group();
        const sizeCoef = this.sizeCoef;
        const padding = 0.01;
        let borderRadius = this.borderRadius;
        let opacityValue = this.data.opacity;
        let avatarShape, avatarGeometry;

        // Create a main avatar mesh (circle or rounded square)
        avatarShape = this.data.tile
            ? createRoundedSquareShape(sizeCoef + 2 * padding, borderRadius)
            : createCircleShape(sizeCoef + 2 * padding);

        avatarGeometry = new AFRAME.THREE.ExtrudeGeometry(avatarShape, { depth: 0.01, bevelEnabled: false });
        const avatarMaterial = new AFRAME.THREE.MeshBasicMaterial({
            color: this.data.color,
            opacity: opacityValue,
            transparent: true
        });

        this.avatarMesh = new AFRAME.THREE.Mesh(avatarGeometry, avatarMaterial);
        group.add(this.avatarMesh);
        this.el.setObject3D('mesh', group);
    },

    // Helper to remove existing content elements (image or text)
    _clearContent() {
        const img = this.el.querySelector("a-image");
        const txt = this.el.querySelector("a-troika-text");
        if (img) img.remove();
        if (txt) txt.remove();
    },

    // Helper to create an a-image element
    _appendImage(src, size) {
        const el = document.createElement("a-image");
        el.setAttribute("src", src);
        el.setAttribute("height", size);
        el.setAttribute("width", size);
        el.setAttribute("position", "0 0 0.05");
        el.setAttribute("material", { alphaTest: 0.5 });
        this.el.appendChild(el);
    },

    // Helper to create troika text
    _appendText(value, fontSize, color) {
        const el = document.createElement("a-troika-text");
        el.setAttribute("value", value);
        el.setAttribute("align", "center");
        el.setAttribute("baseline", "center");
        el.setAttribute("anchor", "center");
        el.setAttribute("color", color);
        el.setAttribute("font-size", fontSize);
        el.setAttribute("position", "0 0 0.05");
        el.setAttribute("letter-spacing", "0");
        el.setAttribute("max-width", fontSize * 4);
        this.el.appendChild(el);
    },

    setContent() {
        const sizeCoef = this.sizeCoef;
        const image = this.data.image || "";

        // Ensure initial is a string and limit to max 2 characters
        let text = (this.data.initial || "").toString();
        if (text.length > 2) {
            const trimmed = text.slice(0, 2);
            if (trimmed !== text) {
                text = trimmed;
                // reflect truncated initial back to attribute (may trigger an update but it's idempotent)
                this.el.setAttribute('avatar', 'initial', trimmed);
                console.warn(`Avatar initial truncated to two characters: "${trimmed}"`);
            }
        }

        // Clear previous content and append new one based on priority: image > initial text
        this._clearContent();
        if (image) {
            this._appendImage(image, sizeCoef);
        }  else if (text) {
            this._appendText(text, sizeCoef, this.data.textcolor);
        }

        this.createAvatar();
        this.updateTextColor();
    },
})
