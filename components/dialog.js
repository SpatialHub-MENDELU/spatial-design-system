import * as AFRAME from "aframe"
import "aframe-troika-text";
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import { createRoundedRectShape, getContrast, setContrastColor} from "../utils/utils.js"
import "../primitives/ar-button.js" 

AFRAME.registerComponent("dialog", {
    schema: {
        opacity: { type: "number", default: 1},
        color: { type: "string", default: PRIMARY_COLOR_DARK},
        mode: { type: "string", default: ""},
        textcolor: { type: "string", default: "black"},
        prependicon: { type: "string", default: ""},
        closingicon: { type: "boolean", default: false},
        title: { type: "string", default: "Dialog Title" },
        content: { type: "string", default: "This is an example of the basic dialog component." },
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
        transition: { type: 'string', default: "" },
    },

    init() {
        // Initialize state variables
        this.finalColor = this.data.color;
        this.basePosition = null;
        this.closeTimer = null;

        this.createDialog();
        this.setContent();
        this.setMode();
        this.updateDialogColor();

        this.el.addEventListener("open-dialog", this.openDialog.bind(this));
        this.el.addEventListener("close-dialog", this.closeDialog.bind(this));
    },

    update(oldData) {
        // Skip the first update loop as init() handles initial setup
        if (!oldData.color) return;
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'opacity':
                    this.updateDialogOpacity();
                    break;
                case 'color':
                    this.updateDialogColor();
                    this.updateTextColor();
                    this.setButtons();
                    break;
                case 'mode':
                    this.setMode();
                    this.updateDialogColor();
                    this.setButtons();
                    break;
                case 'textcolor':
                    this.updateTextColor(); 
                    break;
                case 'prependicon':
                case 'closingicon':
                case 'title':
                case 'content':
                    this.setContent();
                    break;
                case 'buttons':
                    this.setButtons();
                    break;
                default:
                    break;
            }
        });
    },

    createDialog(widthArg = 3, heightArg = 2) {
        if (this.dialogMesh) return;

        const group = new AFRAME.THREE.Group();

        const width = widthArg
        const height = heightArg
        let  borderRadius = 0.12
        this.width = width
        this.height = height

        // Create the main dialog background mesh
        const dialogShape = createRoundedRectShape(this.width, this.height, borderRadius);
        const dialogGeometry  = new AFRAME.THREE.ExtrudeGeometry(
            dialogShape,
            { depth: 0.01, bevelEnabled: false }
        );

        const dialogMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.color, 
            opacity: this.data.opacity, 
            transparent: true
        })

        this.dialogMesh = new AFRAME.THREE.Mesh(dialogGeometry, dialogMaterial);
        group.add(this.dialogMesh);
        
        this.el.setObject3D('mesh', group);
        this.el.setAttribute("visible", false);
    },

    _clearContent() {
        // Helper to remove existing content elements
        const selectors = ["#title", "#content", "#prependIcon", "#closingIcon"];
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
            this.el.emit('dialogAction', { action: action, label: label });
            this.closeDialog();
        });


        // Button positioning logic
        const interButtonSpacing = 0.4; // Space between the buttons
        const assumedButtonWidth = 0.4; // Cannot work with actual width because a-ar-button doesn't have this attribe

        const distanceBetweenCenters = assumedButtonWidth + interButtonSpacing;
        const xPos = (index - (totalButtons - 1) / 2) * distanceBetweenCenters;

        buttonEl.setAttribute("position", { x: xPos, y: -0.7, z: 0.07 });

        this.el.appendChild(buttonEl);
    },

    setContent() {
        this._clearContent();
        if (!this.width) this.createDialog();

        const { width, height } = this;
        const padding = 0.2;
        const contentWidth = width - (padding * 2);
        let titleXOffset = 0;

        const iconSize = 0.15;
        const titleRowYCenter = height / 2 - padding - (iconSize / 2);

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

        // 2. Add Closing Icon
        if (this.data.closingicon === true) {
            const iconSrc = "/close.png";
            const myImg = new Image();
            myImg.src = iconSrc;
            myImg.onload = () => {
                const closeIcon = document.createElement("a-image");
                closeIcon.setAttribute("id", "closingIcon");
                closeIcon.setAttribute("src", iconSrc);
                closeIcon.setAttribute("width", 0.15);
                closeIcon.setAttribute("height", 0.15);
                
                const iconX = width / 2 - padding - 0.075;
                closeIcon.setAttribute("position", {x: iconX, y: titleRowYCenter, z: 0.05});
                closeIcon.classList.add("clickable");
                
                closeIcon.addEventListener("click", () => this.closeDialog());
                this.el.appendChild(closeIcon);
                this.updateTextColor();
            };
        }

        // 3. Add Title
        this._appendText("title", this.data.title, {
            fontSize: 0.15,
            clipRect: `0 -1 ${contentWidth - titleXOffset} 1`,
            position: {x: -width / 2 + padding + titleXOffset, y: titleRowYCenter, z: 0.05}
        });

        // 4. Add Content Text
        // Calculate layout to fit text within the dialog body
        const contentFontSize = 0.1;
        const lineHeight = 1.2;
        const contentStartY = titleRowYCenter - (iconSize / 2) - 0.1;      
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
        if (title) title.setAttribute("color", this.data.mode === "light" ? "black" : "white");
        if (content) content.setAttribute("color", this.data.mode === "light" ? "black" : "white");
    },

    updateDialogColor() {
        // Determine final color based on props
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            this.finalColor = this.data.color;
        } else if (this.data.mode !== "") {
            this.setMode();
        } else {
            this.finalColor = PRIMARY_COLOR_DARK;
            this.updateTextColor();
        }
        
        if (this.dialogMesh) {
            this.dialogMesh.material.color.set(this.finalColor);
        }
    },

    updateTextColor() {
        // Skip auto-contrast if mode is explicitly set
        if ((this.data.mode === 'light' || this.data.mode === 'dark') 
            && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "")) return;
    
        if (!this.dialogMesh) return;

        const dialogColorHex = `#${this.dialogMesh.material.color.getHexString()}`;
        let textcolor = this.data.textcolor;

        // Check contrast and adjust if necessary
        if (getContrast(textcolor, dialogColorHex) <= 60){
            const newTextColor = setContrastColor(dialogColorHex);
            if (newTextColor !== textcolor) {
                textcolor = newTextColor;
                console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} for better visibility.`);
            }
        }

        // Apply color to all text/icon elements
        const elements = ["#title", "#content", "#prependIcon", "#closingIcon"];
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

    updateDialogOpacity() {
        if (this.dialogMesh) {
            this.dialogMesh.material.opacity = this.data.opacity;
        }
    },

    setButtons() {
        // Remove old buttons
        const oldButtons = this.el.querySelectorAll("a-ar-button");
        oldButtons.forEach(b => b.remove());

        let buttons = this.data.buttons;

        // Enforce max 2 buttons limit
        if (buttons.length > 2) {
            console.warn(`Dialog: Maximum of 2 buttons allowed. Truncating extra buttons.`);
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

    openDialog() {
        const dialog = this.el;
        const transition = this.data.transition;
        const duration = 300;
        
        // Clear any pending close actions
        if (this.closeTimer) {
            clearTimeout(this.closeTimer);
            this.closeTimer = null;
            dialog.removeAttribute("animation__scale");
            dialog.removeAttribute("animation__pos");
        }

        // Capture base position for animations
        if (!dialog.getAttribute("visible") || !this.basePosition) {
            const pos = dialog.getAttribute("position");
            this.basePosition = {x: pos.x, y: pos.y, z: pos.z};
        }
        const targetPos = this.basePosition;

        dialog.setAttribute("visible", true);
        dialog.removeAttribute("animation__scale");
        dialog.removeAttribute("animation__pos");

        // Apply transition animation
        if (transition === "bottom-top") {
            dialog.setAttribute("scale", "1 1 1");
            dialog.setAttribute("position", {x: targetPos.x, y: targetPos.y - 0.5, z: targetPos.z});
            dialog.setAttribute("animation__pos", {
                property: "position",
                to: targetPos,
                dur: duration,
                easing: "easeOutQuad"
            });
        } else if (transition === "top-bottom") {
            dialog.setAttribute("scale", "1 1 1");
            dialog.setAttribute("position", {x: targetPos.x, y: targetPos.y + 0.5, z: targetPos.z});
            dialog.setAttribute("animation__pos", {
                property: "position",
                to: targetPos,
                dur: duration,
                easing: "easeOutQuad"
            });
        } else {
            // Default scale animation
            dialog.setAttribute("position", targetPos);
            dialog.setAttribute("scale", "0.1 0.1 0.1");
            dialog.setAttribute("animation__scale", {
                property: "scale",
                to: "1 1 1",
                dur: duration,
                easing: "easeOutQuad"
            });
        }
    },

    closeDialog() {
        const dialog = this.el;
        const transition = this.data.transition;
        const duration = 200;
        const currentPos = this.basePosition || dialog.getAttribute("position");

        dialog.removeAttribute("animation__scale");
        dialog.removeAttribute("animation__pos");

        // Apply closing animation
        if (transition === "bottom-top") {
            dialog.setAttribute("animation__pos", {
                property: "position",
                to: {x: currentPos.x, y: currentPos.y - 0.5, z: currentPos.z},
                dur: duration,
                easing: "easeInQuad"
            });
        } else if (transition === "top-bottom") {
            dialog.setAttribute("animation__pos", {
                property: "position",
                to: {x: currentPos.x, y: currentPos.y + 0.5, z: currentPos.z},
                dur: duration,
                easing: "easeInQuad"
            });
        } else {
            dialog.setAttribute("animation__scale", {
                property: "scale",
                to: "0.1 0.1 0.1",
                dur: duration,
                easing: "easeInQuad"
            });
        }

        // Hide dialog after animation completes
        this.closeTimer = setTimeout(() => {
            dialog.removeAttribute("animation__scale");
            dialog.removeAttribute("animation__pos");
            dialog.setAttribute("visible", false);
            
            // Reset position and scale for next open
            dialog.setAttribute("position", {x: currentPos.x, y: currentPos.y, z: currentPos.z});
            dialog.setAttribute("scale", "1 1 1"); 
            dialog.emit("dialogClosed");
            this.closeTimer = null;
        }, duration);
    }

})