import * as AFRAME from "aframe"
import "aframe-troika-text";
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import { createRoundedRectShape, getContrast, setContrastColor} from "../utils/utils.js"
import "../primitives/ar-button.js" 

AFRAME.registerComponent("card", {
    schema: {
        opacity: { type: "number", default: 1},
        mode: { type: "string", default: ""},
        color: { type: "string", default: PRIMARY_COLOR_DARK},
        textcolor: { type: "string", default: "black"},
        title: { type: "string", default: "Card Title" },
        subtitle: { type: "string", default: "Subitle" },
        content: { type: "string", default: "This is an example of the basic card component." },
        prependicon: { type: "string", default: ""},
        appendicon: { type: "string", default: ""},
        buttons: { 
            default: [{ label: "Close", action: "close" }],
            parse: function (value) {
                if (typeof value === 'string') {
                    try {
                        // Attempt to parse JSON string (e.g. '[{"label": "Yes", "action": "confirm"}]')
                        return JSON.parse(value.replace(/'/g, '"'));
                    } catch (e) {
                        // Fallback for simple comma-separated strings (e.g. "Yes,No")
                        return value.split(',').map(label => ({ label: label.trim(), action: label.trim().toLowerCase() }));
                    }
                }
                return value;
            },
            stringify: JSON.stringify
        },
        outlined: { type: "boolean", default: false },
        image: { type: "string", default: "" },
    },

    init() {
        this.finalColor = this.data.color;

        this.createCard();
        this.setContent();
        this.setMode();
        this.updateCardColor();
        this.updateCardImage();
    },

    update(oldData) {
        // Skip the first update loop as init() handles initial setup
        if (!oldData.color) return;

        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'opacity':
                    this.updateCardOpacity();
                    break;
                case 'color':
                    this.updateCardColor();
                    this.updateTextColor();
                    this.setButtons();
                    break;
                case 'mode':
                    this.setMode();
                    this.updateCardColor();
                    this.setButtons();
                    break;
                case 'textcolor':
                    this.updateTextColor(); 
                    break;
                case 'prependicon':
                case 'appendicon':
                case 'subtitle':
                case 'title':
                case 'content':
                    this.setContent();
                    break;
                case 'buttons':
                    this.setButtons();
                    break;
                case 'outlined':
                    this.setContent();
                    this.updateCardColor();
                    break;
                case 'image':
                    this.updateCardImage();
                    break;
                default:
                    break;
            }
        });
    },

    createCard(widthArg = 3, heightArg = 2) {
        const group = new AFRAME.THREE.Group();

        const width = widthArg;
        const height = heightArg;
        let  borderRadius = 0.12;
        this.width = width;
        this.height = height;

        let opacityValue;
        if (this.data.outlined) {
            opacityValue = this.data.opacity * 0.6; // Outlined opacity
        } else {
            opacityValue = this.data.opacity; // Default user-defined opacity
        }

        // Create the main card background mesh
        const cardShape = createRoundedRectShape(this.width, this.height, borderRadius);
        const cardGeometry  = new AFRAME.THREE.ExtrudeGeometry(
            cardShape,
            { depth: 0.01, bevelEnabled: false }
        );

        const cardMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.color, 
            opacity: opacityValue, 
            transparent: true
        })

        this.cardMesh = new AFRAME.THREE.Mesh(cardGeometry, cardMaterial);
        group.add(this.cardMesh);

        // Create an outline if outlined is true
        if (this.data.outlined) {
            const borderSize = 0.06;
            const outlineShape = createRoundedRectShape(this.width + borderSize, this.height + borderSize, borderRadius + 0.024);
            const outlineGeometry = new AFRAME.THREE.ShapeGeometry(outlineShape);
            const outlineMaterial = new AFRAME.THREE.MeshBasicMaterial({
                color: this.data.color,
                opacity: this.data.opacity,
                transparent: true
            });
            const outlineMesh = new AFRAME.THREE.Mesh(outlineGeometry, outlineMaterial);

            this.outlineMesh = outlineMesh;
            this.outlineMesh.position.set(0, 0, -0.005); // Slightly behind the card
            group.add(outlineMesh);
        }

        this.el.setObject3D('mesh', group);
    },

    _clearContent() {
        // Helper to remove existing content elements
        const selectors = ["#title", "#content", "#subtitle","#prependIcon", "#appendicon"];
        selectors.forEach(sel => {
            const el = this.el.querySelector(sel);
            if (el) el.remove();
        });
    },

    _appendText(id, value, config) {
        // Helper to create troika-text elements
        const el = document.createElement("a-troika-text");
        el.setAttribute("id", id);
        el.setAttribute("value", value || "");
        el.setAttribute("align", config.align || "left");
        el.setAttribute("anchor", config.anchor || "left");
        el.setAttribute("baseline", config.baseline || "center");
        el.setAttribute("font-size", config.fontSize || 0.1);

        if (config.clipRect) el.setAttribute("clip-rect", config.clipRect);
        if (config.position) el.setAttribute("position", config.position);
        if (config.maxWidth) el.setAttribute("max-width", config.maxWidth);
        if (config.lineHeight) el.setAttribute("line-height", config.lineHeight);
        if (config.opacity !== undefined) el.setAttribute("fill-opacity", config.opacity);

        this.el.appendChild(el);
        return el;
    },

    _appendButton(buttonData, index, totalButtons) {
        let label = buttonData.label || "Button";
        if (label.length > 8) label = label.substring(0, 8);
        const action = buttonData.action || "close";

        const buttonEl = document.createElement("a-ar-button");
        buttonEl.setAttribute("content", label);
        buttonEl.setAttribute("size", "medium");
        buttonEl.setAttribute("textonly", true);
        buttonEl.setAttribute("uppercase", true);

        buttonEl.addEventListener("click", () => {
            this.el.emit('cardAction', { action: action, label: label });
        });

        // Button positioning logic
        const interButtonSpacing = 0.4; // Space between the buttons
        const assumedButtonWidth = 0.4; // Cannot work with actual width because a-ar-button doesn't have this attrib

        const distanceBetweenCenters = assumedButtonWidth + interButtonSpacing;
        const xPos = (index - (totalButtons - 1) / 2) * distanceBetweenCenters;

        buttonEl.setAttribute("position", { x: xPos, y: -0.7, z: 0.07 });

        this.el.appendChild(buttonEl);
    },

    setContent() {
        this._clearContent();
        this.createCard();

        const { width, height } = this;
        const padding = 0.2;
        const lineHeight = 1.2;
        const contentWidth = width - (padding * 2);
        let titleXOffset = 0;

        const iconSize = 0.15;
        const titleRowYCenter = height / 2 - padding - (iconSize / 2);
        const subtitleRowYCenter = titleRowYCenter - 0.2;

        // 1. Add Prepend Icon
        if (this.data.prependicon) {
            const iconSrc = this.data.prependicon;
            const myImg = new Image();
            myImg.src = iconSrc;
            myImg.onload = () => {
                const prependIcon = document.createElement("a-image");
                prependIcon.setAttribute("id", "prependIcon");
                prependIcon.setAttribute("src", iconSrc);
                prependIcon.setAttribute("width", iconSize);
                prependIcon.setAttribute("height", iconSize);

                const iconX = -width / 2 + padding + (iconSize / 2);
                prependIcon.setAttribute("position", {x: iconX, y: titleRowYCenter, z: 0.05});                

                this.el.appendChild(prependIcon);
                this.updateTextColor(); // Ensure color is correct after load
            };
            titleXOffset = iconSize + 0.1; // Shift title to the right
        }

        // 2. Add Append Icon
        if (this.data.appendicon) {
            const iconSrc = this.data.appendicon;
            const myImg = new Image();
            myImg.src = iconSrc;
            myImg.onload = () => {
                const appendIcon = document.createElement("a-image");
                appendIcon.setAttribute("id", "appendicon");
                appendIcon.setAttribute("src", iconSrc);
                appendIcon.setAttribute("width", 0.15);
                appendIcon.setAttribute("height", 0.15);

                const iconX = width / 2 - padding - 0.075;
                appendIcon.setAttribute("position", {x: iconX, y: titleRowYCenter, z: 0.05});
                appendIcon.classList.add("clickable");

                this.el.appendChild(appendIcon);
                this.updateTextColor();
            };
        }

        // 3. Add Title
        this._appendText("title", this.data.title, {
            fontSize: 0.15,
            clipRect: `0 -1 ${contentWidth - titleXOffset} 1`,
            position: {x: -width / 2 + padding + titleXOffset, y: titleRowYCenter, z: 0.05}
        });

        // 4. Add Subtitle
        this._appendText("subtitle", this.data.subtitle, {
            fontSize: 0.12,
            clipRect: `0 -1 ${contentWidth} 1`,
            position: {x: -width / 2 + padding, y: subtitleRowYCenter, z: 0.05},
            opacity: this.data.opacity * 0.8
        });

        // 5. Add Content Text
        // Calculate layout to fit text within the card body
        const contentFontSize = 0.1;
        const contentStartY = subtitleRowYCenter - (iconSize / 2) - 0.1;      
        const maxContentHeight = contentStartY - (-height / 2 + 0.5); // Space until buttons area

        // Calculate clipping to avoid cutting lines in half
        const lineHeightUnits = contentFontSize * lineHeight;
        const maxLines = Math.floor(maxContentHeight / lineHeightUnits);
        const clippedHeight = maxLines * lineHeightUnits;

        this._appendText("content", this.data.content, {
            fontSize: contentFontSize,
            lineHeight: lineHeight,
            maxWidth: contentWidth,
            baseline: "top",
            clipRect: `0 -${clippedHeight} ${contentWidth} 0`,
            position: {x: -width / 2 + padding, y: contentStartY, z: 0.05}
        });

        this.setButtons();
        this.updateTextColor();
    },

    setMode() {
        // Mode is ignored if a specific color is set (and it's not the default)
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            return;
        }
        switch (this.data.mode) {
            case "light":
                this.el.setAttribute("material", { color: VARIANT_LIGHT_COLOR, opacity: 1 });
                this.el.querySelector("#title").setAttribute("color", "black");
                this.el.querySelector("#content").setAttribute("color", "black");
                this.finalColor = VARIANT_LIGHT_COLOR;
                break;
            case "dark":
                this.el.setAttribute("material", { color: VARIANT_DARK_COLOR, opacity: 1 });
                this.el.querySelector("#title").setAttribute("color", "white");
                this.el.querySelector("#content").setAttribute("color", "white");
                this.finalColor = VARIANT_DARK_COLOR;
                break;
            default:
                break;
        }

        // Update text elements if they exist
        const title = this.el.querySelector("#title");
        const content = this.el.querySelector("#content");
        const subtitle = this.el.querySelector("#subtitle");
        if (title) title.setAttribute("color", this.data.mode === "light" ? "black" : "white");
        if (content) content.setAttribute("color", this.data.mode === "light" ? "black" : "white");
        if (subtitle) subtitle.setAttribute("color", this.data.mode === "light" ? "black" : "white");
    },

    updateCardColor() {
        // Determine final color based on props
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            this.finalColor = this.data.color;
        } else if (this.data.mode !== "") {
            this.setMode();
        } else {
            this.finalColor = PRIMARY_COLOR_DARK;
            this.updateTextColor();
        }

        if (this.cardMesh) {
            this.cardMesh.material.color.set(this.finalColor);
        }
        if (this.outlineMesh) {
            this.outlineMesh.material.color.set(this.finalColor);
        }
    },

    updateTextColor() {
        // Skip auto-contrast if mode is explicitly set
        if ((this.data.mode === 'light' || this.data.mode === 'dark') 
            && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "")) return;

        if (!this.cardMesh) return;

        const cardColorHex = `#${this.cardMesh.material.color.getHexString()}`;
        let textcolor = this.data.textcolor;

        // Check contrast and adjust if necessary
        if (getContrast(textcolor, cardColorHex) <= 60){
            const newTextColor = setContrastColor(cardColorHex);
            if (newTextColor !== textcolor) {
                textcolor = newTextColor;
                console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} for better visibility.`);
            }
        }

        // Apply color to all text/icon elements
        const elements = ["#title", "#content", "#subtitle","#prependIcon", "#appendicon"];
        elements.forEach(sel => {
            const el = this.el.querySelector(sel);
            if (el) el.setAttribute("color", textcolor);
        });

        return textcolor;
    },

    _updateButtonTextColor(textcolor) {
        const buttons = this.el.querySelectorAll("a-ar-button");
        buttons.forEach((button) => {
            button.setAttribute("textcolor", textcolor);
        });
    },

    updateCardOpacity() {
        if (this.cardMesh) {
            this.cardMesh.material.opacity = this.data.outlined ? this.data.opacity * 0.6 : this.data.opacity;
        }
        if (this.outlineMesh) {
            this.outlineMesh.material.opacity = this.data.opacity;
        }
        const subtitle = this.el.querySelector("#subtitle");
        if (subtitle) {
            subtitle.setAttribute("fill-opacity", this.data.opacity * 0.9);
        }
    },

    setButtons() {
        // Remove old buttons
        const oldButtons = this.el.querySelectorAll("a-ar-button");
        oldButtons.forEach(b => b.remove());

        let buttons = this.data.buttons;

        // Enforce max 2 buttons limit
        if (buttons.length > 2) {
            console.warn(`Card: Maximum of 2 buttons allowed. Truncating extra buttons.`);
            buttons = buttons.slice(0, 2); // Keep only the first two buttons
        }

        buttons.forEach((button, index) => {
            this._appendButton(button, index, buttons.length);
        });

        // Determine button text color
        let finalTextColor = this.data.textcolor;
        if ((this.data.mode === "dark" || this.data.mode === "light")
            && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "")) {
            finalTextColor = this.data.mode === 'dark' ? 'white' : 'black';
        } else {
            finalTextColor = this.updateTextColor() || this.data.textcolor;
        }

        this._updateButtonTextColor(finalTextColor);
    },

    updateCardImage() {
        if (!this.cardMesh) return;

        if (this.data.image) {
            new AFRAME.THREE.TextureLoader().load(this.data.image, (texture) => {
                if (this.data.image) {
                    texture.wrapS = AFRAME.THREE.ClampToEdgeWrapping;
                    texture.wrapT = AFRAME.THREE.ClampToEdgeWrapping;
                    texture.repeat.set(1 / this.width, 1 / this.height);
                    texture.offset.set(0.5, 0.5);
                    this.cardMesh.material.map = texture;
                    // this.cardMesh.material.color.set('#ffffff');
                    this.cardMesh.material.needsUpdate = true;
                }
            });
        } else {
            this.cardMesh.material.map = null;
            this.cardMesh.material.needsUpdate = true;
            this.updateCardColor();
        }
    },

})
