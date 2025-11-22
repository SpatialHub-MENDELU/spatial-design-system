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
        icon: { type: "string", default: ""},
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
        if (!oldData.color) return;
    
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
                case 'icon':
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
        this.avatarMesh.material.color.set(this.data.color);
        this.updateTextColor();
    },

    updateAvatarOpacity() {
        this.avatarMesh.material.opacity = this.data.opacity;
    },

    updateTextColor() {
        const avatarColorHex = `#${this.avatarMesh.material.color.getHexString()}`;
        let textcolor = this.data.textcolor;

        // Calculate contrast
        const contrast = getContrast(textcolor, avatarColorHex);

        // If the contrast is not high enough, adjust the text color
        if (contrast <= 60) {
            const newTextColor = setContrastColor(avatarColorHex);

            // Only update and alert if the color actually changes
            if (newTextColor !== textcolor) {
                textcolor = newTextColor;
                console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} for better visibility.`);
            }
        }

        // Update for troika-text
        const textEl = this.el.querySelector("a-troika-text");
        if (textEl) {
            textEl.setAttribute("color", textcolor);
        }
    },

    setSize() {
        let sizeCoef;
        switch (this.data.size) {
            case "small":
                sizeCoef = 0.06;
                break;
            
            case "medium":
                sizeCoef = 0.075;
                break;

            case "large":
                sizeCoef = 0.09;
                break;

            default:
                break
        }
        this.sizeCoef = sizeCoef;
    },

    setBorderRadius() {
        let borderRadius = 0;

        switch (this.data.rounded) {
            case "sm":
                borderRadius = 0.02;
                break;
            case "md":
                borderRadius = 0.04;
                break;
            case "lg":
                borderRadius = 0.06;
                break;
            default:
                break
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

        // Create a main avatar mesh
        if (this.data.tile) {
            avatarShape = createRoundedSquareShape(sizeCoef + 2 * padding, borderRadius);
        } else {
            avatarShape = createCircleShape(sizeCoef + 2 * padding);
        }

        avatarGeometry = new AFRAME.THREE.ExtrudeGeometry(
            avatarShape,
            { depth: 0.01, bevelEnabled: false }
        );             

        const avatarMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.color, 
            opacity: opacityValue, 
            transparent: true
        });

        const avatarMesh = new AFRAME.THREE.Mesh(avatarGeometry, avatarMaterial);
        this.avatarMesh = avatarMesh;

        group.add(avatarMesh);

        this.el.setObject3D('mesh', group);
    },

    setContent() {
        const icon = this.data.icon === "" ? "" : this.data.icon;
        const image = this.data.image === "" ? "" : this.data.image;
        const sizeCoef = this.sizeCoef;
        let text = this.data.initial;

        if (image !== "" && image !== undefined && image !== null) {
            let imageEl = this.el.querySelector("a-image");
            if (imageEl) imageEl.remove();

            imageEl = document.createElement("a-image");
            const imageSize = sizeCoef;

            imageEl.setAttribute("src", image);
            imageEl.setAttribute("height", imageSize);
            imageEl.setAttribute("width", imageSize);
            imageEl.setAttribute("position", "0 0 0.02");
            imageEl.setAttribute("material", { alphaTest: 0.5 });
            this.el.appendChild(imageEl);
        } else if (icon !== "" && icon !== undefined && icon !== null) {
            let iconEl = this.el.querySelector("a-image");
            if (iconEl) iconEl.remove();

            iconEl = document.createElement("a-image");
            const iconSize = sizeCoef;

            iconEl.setAttribute("src", icon);
            iconEl.setAttribute("height", iconSize);
            iconEl.setAttribute("width", iconSize);
            iconEl.setAttribute("position", "0 0 0.02");
            iconEl.setAttribute("material", { alphaTest: 0.5 });
            this.el.appendChild(iconEl);
        } else if (text !== "" || text !== undefined || text !== null) {
            let textEl = this.el.querySelector("a-troika-text");
            if (textEl) textEl.remove();

            textEl = document.createElement("a-troika-text");
            const fontSize = sizeCoef; // Adjust font size relative to avatar
            
            textEl.setAttribute("value", text);
            textEl.setAttribute("align", "center");
            textEl.setAttribute("baseline", "center");
            textEl.setAttribute("anchor", "center");
            textEl.setAttribute("color", this.data.textcolor);
            textEl.setAttribute("font-size", fontSize);
            textEl.setAttribute("position", "0 0 0.02");
            textEl.setAttribute("letter-spacing", "0");
            textEl.setAttribute("max-width", sizeCoef * 4);
            
            this.el.appendChild(textEl);
        }

        this.createAvatar();
        this.updateTextColor();
    },
})
