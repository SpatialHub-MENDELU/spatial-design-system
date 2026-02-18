import * as AFRAME from "aframe"
import "aframe-troika-text";
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import "../primitives/ar-button.js" 

AFRAME.registerComponent("buttontoggle", {
    schema: {
        opacity: { type: "number", default: 1},
        size: { type: "string", default: "medium"},
        color: { type: "string", default: PRIMARY_COLOR_DARK},
        mode: { type: "string", default: ""},
        buttons: { 
            default: [{ label: "Close", icon: "", iconpos: "left", action: "close" }],
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
        multiple: { type: 'boolean', default: false },
        mandatory: { type: 'boolean', default: false },
        rounded: { type: 'boolean', default: false },
        tile: { type: 'boolean', default: false },
    },

    init() {
        // Initialize state variables
        this.selectedIndices = [];
        this.buttons = [];
        this.finalColor = this.data.color;

        if (this.data.mandatory && this.data.buttons.length > 0) {
            this.selectedIndices.push(0);
        }

        this.updateButtonsColor(); // Determine finalColor
        this.setButtons();
    },

    update(oldData) {
        // Skip the first update loop as init() handles initial setup
        if (!oldData.color) return;

        // Handle if multiple is switched from true to false
        if (oldData.multiple === true && this.data.multiple === false) {
            if (this.selectedIndices.length > 1) {
                // Keep only the most recent selection (the last element)
                this.selectedIndices = [this.selectedIndices[this.selectedIndices.length - 1]];
            }
        }

        if (this.data.mandatory && this.data.buttons.length > 0) {
            this.selectedIndices.push(0);
        }
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'opacity':
                    this.updateButtonsOpacity();
                    break;
                case 'color':
                case 'mode':
                    this.updateButtonsColor();
                    break;
                case 'buttons':
                case 'size':
                case 'mandatory':
                case 'multiple':
                case 'rounded':
                case 'tile':
                    this.setButtons();
                    break;
                default:
                    break;
            }
        });
    },

    setMode() {
        // Mode is ignored if a specific color is set (and it's not the default)
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            return;
        }
        switch (this.data.mode) {
            case "light":
                this.finalColor = VARIANT_LIGHT_COLOR;
                break;
            case "dark":
                this.finalColor = VARIANT_DARK_COLOR;
                break;
            default:
                break;
        }
    },

    updateButtonsColor() {
        // Determine final color based on props
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            this.finalColor = this.data.color;
        } else if (this.data.mode !== "") {
            this.setMode();
        } else {
            this.finalColor = PRIMARY_COLOR_DARK;
        }
        
        this.buttons.forEach((button, index) => {
            this.updateButtonVisuals(button, index);
        });
    },

    updateButtonVisuals(buttonEl, index) {
        const isSelected = this.selectedIndices.includes(index);

        if (isSelected) {
            buttonEl.setAttribute("color", this.finalColor); // Set to the 'active' color
        } else {
            buttonEl.setAttribute("color", "white"); // Set to the 'default/unselected' color
        }
    },

    updateButtonsOpacity() {
        this.buttons.forEach((button) => {
            button.setAttribute("opacity", this.data.opacity);
        });
    },

    setButtons() {
        // Remove old buttons
        this.el.innerHTML = "";
        this.buttons = [];

        let currentX = 0;
        const buttonData = this.data.buttons;
    
        buttonData.forEach((data, index) => {
            const buttonEl = document.createElement("a-ar-button");
            
            buttonEl.setAttribute("size", this.data.size);
            if (data.label) buttonEl.setAttribute("content", data.label);
            buttonEl.setAttribute("elevated", false);
            buttonEl.setAttribute("animate", false);
            //buttonEl.setAttribute("outlined", true);

            
            if (data.icon) buttonEl.setAttribute("icon", data.icon);
            if (data.iconpos) buttonEl.setAttribute("iconpos", data.iconpos);
            
            // Handle Rounded/Tile logic
            this.applyShapeAttributes(buttonEl, index, buttonData.length);

            buttonEl.addEventListener("click", () => {
                this.onButtonClick(index);
                this.el.emit('buttonAction', { action: data.action, label: data.label });
            });

            this.el.appendChild(buttonEl);
            this.buttons.push(buttonEl);

            this.updateButtonVisuals(buttonEl, index);
            
            let width = this.calculateButtonWidth(data.label, data.icon);
            buttonEl.setAttribute("position", { x: currentX + width / 2, y: 0, z: 0 }); // Position center of button
            currentX += width;
        });

        // Center the whole group
        this.el.object3D.position.x = -currentX / 2; // By the end of the cycle 'currentX' is the total width of all buttons
    },

    applyShapeAttributes(buttonEl, index, total) {
        const isFirst = index === 0;
        const isLast = index === total - 1;
        const isSingle = total === 1;

        // Rounded prop has highest priority
        if (this.data.rounded) {
            if (isSingle) {
                buttonEl.setAttribute("roundedsides", "full");
            } else if (isFirst) {
                buttonEl.setAttribute("roundedsides", "left");
            } else if (isLast) {
                buttonEl.setAttribute("roundedsides", "right");
            } else {
                buttonEl.setAttribute("tile", true);
                return;
            }
            buttonEl.setAttribute("rounded", true);
            return;
        }

        // Tile prop has second priority
        if (this.data.tile) {
            buttonEl.setAttribute("tile", true);
            return;
        }

        // Default behavior - small border radius
        if (isSingle) {
            buttonEl.setAttribute("roundedsides", "full");
        } else if (isFirst) {
            buttonEl.setAttribute("roundedsides", "left");
        } else if (isLast) {
            buttonEl.setAttribute("roundedsides", "right");
        } else {
            buttonEl.setAttribute("tile", true);
        }
    },

    calculateButtonWidth(text, icon) {
        let sizeCoef = 0.075; // medium
        if (this.data.size === "small") sizeCoef = 0.06;
        if (this.data.size === "large") sizeCoef = 0.09;
        if (this.data.size === "extra-large") sizeCoef = 0.12;

        const letterWidthRatio = 0.55;
        const textStr = text || "";
        const displayText = textStr.length > 15 ? textStr.substring(0, 12) + "..." : textStr;
        
        const textWidth = displayText.length * letterWidthRatio * sizeCoef;
        const iconWidth = 1.0 * sizeCoef;
        const innerPadding = 0.05;
        const outerPadding = 0.1;

        let width = 0;
        if (icon) {
            if (displayText !== "") {
                width = innerPadding + iconWidth + innerPadding + textWidth + outerPadding;
            } else {
                width = innerPadding + iconWidth + innerPadding;
            }
        } else {
            width = outerPadding + textWidth + outerPadding;
        }
        return width;
    },

    onButtonClick(index) {
        const foundIndex = this.selectedIndices.indexOf(index);
        const isSelected = foundIndex > -1;

        if (this.data.multiple) {
            if (isSelected) {
                // Prevent deselecting if it's the last one and mandatory is true
                if (this.data.mandatory && this.selectedIndices.length === 1) return;
                this.selectedIndices.splice(foundIndex, 1);
            } else {
                this.selectedIndices.push(index);
            }
        } else {
            if (isSelected) {
                // If mandatory, clicking the selected button does nothing
                if (this.data.mandatory) return;
                this.selectedIndices = [];
            } else {
                // Radio button behavior
                this.selectedIndices = [index];
            }
        }

        // Update visuals for all buttons
        this.buttons.forEach((btn, i) => this.updateButtonVisuals(btn, i));
        
        const selectedValues = this.selectedIndices.map(i => this.data.buttons[i]);
        this.el.emit("change", { 
            value: this.data.multiple ? selectedValues : (selectedValues[0] || null) 
        });
    },
})