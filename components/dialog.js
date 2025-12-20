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
        title: { type: "string", default: "Dialog" },
        content: { type: "string", default: "This is the example of basic dialog component." },
        buttons: { type: "array", default: ["Close"] },
        persistent: { type: 'boolean', default: false },
        transition: { type: 'string', default: "" },
    },

    init() {
        this.finalColor = this.data.color;
        this.createDialog();
        this.setContent();
        this.setMode();
        this.updateDialogColor();
    },

    update(oldData) {
        // Skip the update for the first time since init() handles the initial setup
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
                case 'persistent':
                    this.setPersistency();
                    break;
                case 'autoclose':
                    this.setAutoClose();
                    break;
                case 'backdropfilter':
                    this.setBackdropFilter();
                    break;
                case 'transition':
                    this.setTransition();
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

        // Create a main dialog mesh
        const dialogShape = createRoundedRectShape(width, height, borderRadius)
        const dialogGeometry  = new AFRAME.THREE.ExtrudeGeometry(
            dialogShape,
            { depth: 0.01, bevelEnabled: false }
        );

        const dialogMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.color, 
            opacity: this.data.opacity, 
            transparent: true
        })

        const dialogMesh = new AFRAME.THREE.Mesh(dialogGeometry, dialogMaterial)
        this.dialogMesh = dialogMesh;

        group.add(dialogMesh);
        this.el.setObject3D('mesh', group);
        this.el.setAttribute("visible", false);
    },

    _clearContent() {
        const titleEl = this.el.querySelector("#title");
        const contentEl = this.el.querySelector("#content");
        const prependIconEl = this.el.querySelector("#prependIcon");
        const closingIconEl = this.el.querySelector("#closingIcon");
        if (titleEl) titleEl.remove();
        if (contentEl) contentEl.remove();
        if (prependIconEl) prependIconEl.remove();
        if (closingIconEl) closingIconEl.remove();
    },

    _appendText(id, value, config) {
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

    _appendButton(text, index) {
        const buttonEl = document.createElement("a-ar-button");
        buttonEl.setAttribute("content", text);
        buttonEl.setAttribute("size", "medium");
        buttonEl.setAttribute("textonly", true);
        buttonEl.setAttribute("uppercase", true);
        buttonEl.addEventListener("click", () => this.closeDialog());

        const rightEdgePadding = 0.2; // Padding from the right edge of the dialog
        const interButtonSpacing = 0.2; // Space between the buttons
        const assumedButtonWidth = 0.4;

        const rightButtonXCenter = this.width / 2 - rightEdgePadding - (assumedButtonWidth / 2); // E.g., 3/2 - 0.2 - 0.2 = 1.1
        const leftButtonXCenter = rightButtonXCenter - assumedButtonWidth - interButtonSpacing; // E.g., 1.1 - 0.4 - 0.2 = 0.5

        let xPos;
        if (index === 0) {
            if (this.data.buttons.length === 1) {
                xPos = rightButtonXCenter;
            } else {
                xPos = leftButtonXCenter;
            }
        } else { // index === 1 (The second, rightmost button)
            xPos = rightButtonXCenter;
        }

        buttonEl.setAttribute("position", { x: xPos, y: -0.7, z: 0.07 });
        
        this.el.appendChild(buttonEl);
    },

    setContent() {
        this._clearContent();
        if (!this.width) this.createDialog();

        const width = this.width;
        const height = this.height;
        const padding = 0.2;
        // Calculate available width for content considering padding
        const contentWidth = width - (padding * 2);
        let titleXOffset = 0;

        const iconSize = 0.15;
        const titleRowYCenter = height / 2 - padding - (iconSize / 2); // height/2 - 0.2 - 0.075

        // Add prepend icon
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
                this.updateTextColor();
            };
            titleXOffset = 0.15 + 0.1; // icon width + spacing
        }

        // Add closing icon
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
                closeIcon.setAttribute("position", {x: width / 2 - padding - 0.075, y: titleRowYCenter, z: 0.05});
                closeIcon.classList.add("clickable");
                closeIcon.addEventListener("click", () => this.closeDialog());
                this.el.appendChild(closeIcon);
                this.updateTextColor();
            };
        }

        // Add title text
        this._appendText("title", this.data.title, {
            fontSize: 0.15,
            clipRect: `0 -1 ${contentWidth - titleXOffset} 1`,
            position: {x: -width / 2 + padding + titleXOffset, y: titleRowYCenter, z: 0.05}
        });

        // All calculations for content text, so that:
        // 1. It fits within the dialog, and it is positioned correctly (below the title)
        // 2. It is clipped if too long, and in a way that only full lines are shown (not lines cut in half vertically)
        const contentFontSize = 0.1;
        const lineHeight = 1.2;
        const contentStartY = titleRowYCenter - (iconSize / 2) - 0.1; // 0.075 for half font size + 0.1 for spacing        
        const maxContentHeight = contentStartY - (-height / 2 + 0.5);
        const lineHeightUnits = contentFontSize * lineHeight;
        const maxLines = Math.floor(maxContentHeight / lineHeightUnits);
        const clippedHeight = maxLines * lineHeightUnits;

        // Add content text
        this._appendText("content", this.data.content, {
            fontSize: contentFontSize,
            lineHeight: lineHeight,
            maxWidth: contentWidth,
            baseline: "top",
            clipRect: `0 -${clippedHeight} ${contentWidth} 0`, // Clip text that exceeds available height
            position: {x: -width / 2 + padding, y: contentStartY, z: 0.05}
        });

        this.setButtons();
        this.updateTextColor();
    },

    setMode() {
        //If color is set ignore the mode
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
    },

    updateDialogColor() {
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            this.finalColor = this.data.color;
        } else if (this.data.mode !== "") {
            this.setMode();
        } else {
            this.finalColor = PRIMARY_COLOR_DARK;
            this.updateTextColor();
        }
        this.dialogMesh.material.color.set(this.finalColor);
    },

    updateTextColor() {
        // If mode will be used, ignore the textcolor
        if ((this.data.mode === 'light' || this.data.mode === 'dark') 
            && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "")) return;
    
        const dialogColorHex = `#${this.dialogMesh.material.color.getHexString()}`;
        let textcolor = this.data.textcolor;

        // If the contrast is not high enough, set the textcolor to white/black
        if (getContrast(textcolor, dialogColorHex) <= 60){
            const newTextColor = setContrastColor(dialogColorHex);
            // Only update and alert if the color actually changes
            if (newTextColor !== textcolor) {
                textcolor = newTextColor;
                console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} for better visibility.`);
            }
        }

        const titleEl = this.el.querySelector("#title");
        if (titleEl) {
            titleEl.setAttribute("color", textcolor);
        }
        const contentEl = this.el.querySelector("#content");
        if (contentEl) {
            contentEl.setAttribute("color", textcolor);
        }
        const prependIconEl = this.el.querySelector("#prependIcon");
        if (prependIconEl) {
            prependIconEl.setAttribute("color", textcolor);
        }
        const closingIconEl = this.el.querySelector("#closingIcon");
        if (closingIconEl) {
            closingIconEl.setAttribute("color", textcolor);
        }

        return textcolor;
    },

    _updateButtonTextColor(textcolor) {
        const buttons = this.el.querySelectorAll("a-ar-button");
        buttons.forEach((button) => {
            button.setAttribute("textcolor", textcolor);
        });
    },

    updateDialogOpacity() {
        const opacityValue = this.data.opacity;
        this.dialogMesh.material.opacity = opacityValue;
    },

    setButtons() {
        const oldButtons = this.el.querySelectorAll("a-ar-button");
        oldButtons.forEach(b => b.remove());

        let buttons = this.data.buttons;

        if (buttons.length > 2) {
            console.log(`The dialog can have a maximum of 2 buttons. That's why other buttons have been removed.`);
            buttons = buttons.slice(0, 2); // Keep only the first two buttons
        }
    
        buttons.forEach((buttonText, index) => {
            this._appendButton(buttonText, index);
        });

        let finalTextColor = this.data.textcolor; // Default to user-set textcolor

        // Check if mode will be used
        if ((this.data.mode === "dark" || this.data.mode === "light")
            && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "")) {
            finalTextColor = this.data.mode === 'dark' ? 'white' : 'black';
        } 
        // Otherwise, the text color is determined by contrast, which is run in updateTextColor
        else {
            finalTextColor = this.updateTextColor() || this.data.textcolor;
        }

        this._updateButtonTextColor(finalTextColor);
    },

    closeDialog() {
        const dialog = this.el;

        dialog.setAttribute("animation", {
            property: "scale",
            to: "0.1 0.1 0.1",
            dur: 100,
            easing: "easeInOutQuad"
        });

        setTimeout(() => {
            dialog.setAttribute("visible", false);
            dialog.setAttribute("scale", "1 1 1"); // Reset scale for next open
            dialog.emit("dialogClosed")
        }, 100);
    }

    
})