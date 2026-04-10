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
        title: { type: "string", default: "" },
        subtitle: { type: "string", default: "" },
        content: { type: "string", default: "" },
        prependicon: { type: "string", default: ""},
        appendicon: { type: "string", default: ""},
        buttons: { 
            default: [],
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
                case 'mode':
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
                    this.setContent();
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

    createCard(widthArg = 1.5, heightArg = 1) {
        const group = new AFRAME.THREE.Group();

        const width = widthArg;
        const height = heightArg;
        let  borderRadius = 0.06;
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
            color: this.finalColor, 
            opacity: opacityValue, 
            transparent: true
        })

        this.cardMesh = new AFRAME.THREE.Mesh(cardGeometry, cardMaterial);
        group.add(this.cardMesh);

        // Create an outline if outlined is true
        if (this.data.outlined) {
            const borderSize = 0.02;
            const outlineShape = createRoundedRectShape(this.width + borderSize, this.height + borderSize, borderRadius + 0.01);
            const outlineGeometry = new AFRAME.THREE.ShapeGeometry(outlineShape);
            const outlineMaterial = new AFRAME.THREE.MeshBasicMaterial({
                color: this.finalColor,
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
        el.setAttribute("font-size", config.fontSize || 0.06);

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
        buttonEl.setAttribute("size", "small");
        buttonEl.setAttribute("textonly", true);
        buttonEl.setAttribute("uppercase", true);

        buttonEl.addEventListener("click", () => {
            this.el.emit('cardAction', { action: action, label: label });
        });

        // Button positioning logic
        const innerButtonSpacing = 0.2; // Space between the buttons
        const assumedButtonWidth = 0.35; // Cannot work with actual width because a-ar-button doesn't have this attrib

        const distanceBetweenCenters = assumedButtonWidth + innerButtonSpacing;
        const xPos = (index - (totalButtons - 1) / 2) * distanceBetweenCenters;

        buttonEl.setAttribute("position", { x: xPos, y: -this.height / 2 + 0.15, z: 0.07 });

        this.el.appendChild(buttonEl);
    },

      _appendIcon(src, size, id) {
      const iconEl = document.createElement("a-image");
      if (id) iconEl.setAttribute("id", id);
      iconEl.setAttribute("src", src);
      iconEl.setAttribute("geometry", { width: size, height: size });
      this.el.appendChild(iconEl);
      return iconEl;
  },

    setContent() {
        this._clearContent();
        
        // Default dimensions
        let width = 1.5;
        let height = 1;

        const padding = 0.1;
        const iconSize = 0.075;
        const lineHeight = 1.2;
        const contentFontSize = 0.06;
        
        // Calculate content start offset from top
        const offset_titleRow = padding + (iconSize / 2);
        const offset_subtitleRow = offset_titleRow + 0.12;
        
        let offset_contentStart = 0;
        if (this.data.title) {
            offset_contentStart = this.data.subtitle ? offset_subtitleRow + (iconSize / 2) + 0.05 : offset_titleRow + (iconSize / 2) + 0.05;
        } else {
            offset_contentStart = offset_titleRow;
        }

        const hasButtons = this.data.buttons && this.data.buttons.length > 0;

        const contentWidth = this.data.appendicon ? width - (padding * 2) - iconSize - 0.05 : width - (padding * 2);
        // Estimate text height
        const charWidth = contentFontSize * 0.55; // Approx width factor
        const charsPerLine = Math.floor(contentWidth / charWidth);
        const lines = Math.ceil(this.data.content.length / charsPerLine);
        const textHeight = lines * (contentFontSize * lineHeight);
        
        // Calculate new height
        // height = top_space + text + bottom_padding
        // top_space is offset_contentStart
        const bottomPadding = hasButtons ? 0.25 : padding;
        height = offset_contentStart + textHeight + bottomPadding;
        
        // Enforce a minimum height if needed, or just use calculated
        height = Math.max(height, 0.4); // Minimum height

        this.createCard(width, height);

        let titleXOffset = 0;

        const titleRowYCenter = height / 2 - padding - (iconSize / 2);
        const subtitleRowYCenter = titleRowYCenter - 0.12;

        // 1. Add Prepend Icon
        if (this.data.prependicon && this.data.title) {
            const iconEl = this._appendIcon(this.data.prependicon, iconSize, "prependIcon");

            const iconX = -width / 2 + padding + (iconSize / 2);
            iconEl.setAttribute("position", {x: iconX, y: titleRowYCenter, z: 0.05});                

            this.updateTextColor(); // Ensure color is correct after load            
            titleXOffset = iconSize + 0.05; // Shift title to the right
        }

        // 2. Add Append Icon
        if (this.data.appendicon) {
            const iconEl = this._appendIcon(this.data.appendicon, iconSize, "appendicon");

            const iconX = width / 2 - padding - (iconSize / 2);
            iconEl.setAttribute("position", {x: iconX, y: titleRowYCenter, z: 0.05});

            iconEl.addEventListener('click', () => {
                this.el.emit('appendIconClicked');
            });

            this.updateTextColor();
        };
    

        // 3. Add Title
        if (this.data.title) {
            this._appendText("title", this.data.title, {
                fontSize: 0.09,
                clipRect: `0 -1 ${contentWidth - titleXOffset} 1`,
                position: {x: -width / 2 + padding + titleXOffset, y: titleRowYCenter, z: 0.05}
            });
        }

        // 4. Add Subtitle
        // If there is no subtitle, don't append text because it will just render vertical space
        // Subtitle can only exist if title exists
        if (this.data.title && this.data.subtitle) {
            this._appendText("subtitle", this.data.subtitle, {
                fontSize: 0.075,
                clipRect: `0 -1 ${contentWidth} 1`,
                position: {x: -width / 2 + padding, y: subtitleRowYCenter, z: 0.05},
                opacity: this.data.opacity * 0.8
            });
        }

        // 5. Add Content Text
        // Calculate layout to fit text within the card body
        let contentStartY = 0;
        if (this.data.title) {
            contentStartY = this.data.subtitle ? subtitleRowYCenter - (iconSize / 2) - 0.05 : titleRowYCenter - (iconSize / 2) - 0.05 ;
        } else {
            contentStartY = titleRowYCenter;
        }   

        this._appendText("content", this.data.content, {
            fontSize: contentFontSize,
            lineHeight: lineHeight,
            maxWidth: contentWidth,
            baseline: "top",
            position: {x: -width / 2 + padding, y: contentStartY, z: 0.05}
        });

        this.setButtons();
        this.updateTextColor();
    },

    setMode() {
        // Map modes to their specific colors
        if (this.data.mode === "light") {
            this.finalColor = VARIANT_LIGHT_COLOR;
        } else if (this.data.mode === "dark") {
            this.finalColor = VARIANT_DARK_COLOR;
        }
    },

    updateCardColor() {
        // Determine final color based on props
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            this.finalColor = this.data.color;
        } else if (this.data.mode !== "") {
            this.setMode();
        } else {
            this.finalColor = PRIMARY_COLOR_DARK;
        }

        if (this.cardMesh) {
            this.cardMesh.material.color.set(this.finalColor);
        }
        if (this.outlineMesh) {
            this.outlineMesh.material.color.set(this.finalColor);
        }

        this.updateTextColor();
    },

    updateTextColor() {
        if (!this.cardMesh) return;

        // Determine if we should use automatic contrast or mode-based color
        let targetTextColor;
        const isCustomColor = this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "";

        if (!isCustomColor && this.data.mode === "light") {
            targetTextColor = "black";
        } else if (!isCustomColor && this.data.mode === "dark") {
            targetTextColor = "white";
        } else {
            // Logic for custom colors or no mode: Use contrast check
            const cardColorHex = `#${this.cardMesh.material.color.getHexString()}`;
            targetTextColor = this.data.textcolor;

            if (getContrast(targetTextColor, cardColorHex) <= 60) {
                targetTextColor = setContrastColor(cardColorHex);
            }
        }

        // Apply to elements
        const elements = ["#title", "#content", "#subtitle"];
        elements.forEach(sel => {
            const el = this.el.querySelector(sel);
            if (el) el.setAttribute("color", targetTextColor);
        });

        const iconElements = this.el.querySelectorAll("a-image");
        iconElements.forEach(iconEl => {
            iconEl.setAttribute("color", targetTextColor);
        });

        return targetTextColor;
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
            subtitle.setAttribute("fill-opacity", this.data.opacity * 0.8);
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
            let imageSrc = this.data.image;
            if (imageSrc.startsWith('#')) {
                const imageEl = document.querySelector(imageSrc);
                if (imageEl) {
                    imageSrc = imageEl.src || imageEl.getAttribute('src');
                }
            }

            new AFRAME.THREE.TextureLoader().load(imageSrc, (texture) => {
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
