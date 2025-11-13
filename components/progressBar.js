import * as AFRAME from "aframe";
import * as TWEEN from "@tweenjs/tween.js";
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR, SUCCESS_COLOR, WARNING_COLOR, ERROR_COLOR, DISABLED_COLOR} from "../utils/colors.js";
import { createRoundedRectShape, getContrast, setContrastColor} from "../utils/utils.js";

AFRAME.registerComponent("progressBar", {
    schema: {
        opacity: { type: "number", default: 1 },
        color: { type: "string", default: PRIMARY_COLOR_DARK},
        mode: { type: "string", default: ""}, // light-dark
        state: { type: "string", default: ""}, // error-success-warning-disabled-indiciting
        value: { type: "number", default: 100 },
        textvisibility: {type: "boolean", default: false},
        textcolor: { type: "string", default: "black"},
        size: { type: "string", default: "medium"},
        rounded: { type: "boolean", default: false },
        reversed: { type: "boolean", default: false },
    },

    init() {
        this.finalColor = this.data.color;
        this.userRounded = this.data.rounded; // Store the user's original rounded preference
        this.effectiveRounded = this.calculateEffectiveRounded(); // Calculate what should actually be displayed
        this.setSize();
        this.setContent();
        this.setMode();
        this.setState();
    },

    update(oldData) {
        // Skip the update for the first time since init() handles the initial setup
        if (!oldData.color) return;

        // Update userRounded when the rounded property changes
        if (this.data.rounded !== oldData.rounded) {
            this.userRounded = this.data.rounded;
        }

        // Recalculate effective rounded state when value or rounded changes
        if (this.data.value !== oldData.value || this.data.rounded !== oldData.rounded) {
            this.effectiveRounded = this.calculateEffectiveRounded();
        }


        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'size':
                    this.setSize();
                    this.setContent();
                    break;
                case 'reversed':
                    this.reverseProgressBar();
                case 'rounded':
                    this.setContent();
                    break;
                case 'value':
                    this.setContent();
                    this.updateProgressBarColor();
                    break;
                case 'textcolor':
                    this.updateTextColor();
                    break;
                case 'textvisibility':
                    this.updateTextVisibility();
                    break;
                case 'mode':
                    this.setMode();
                    this.updateProgressBarColor();
                    break;
                case 'state':
                    this.setState();
                    break;
                case 'color':
                    this.updateProgressBarColor();
                    break;
                case 'opacity':
                    this.updateProgressBarOpacity();
                    break;
                default:
                    break;
            }
        });
    },

    // Helper method to calculate whether rounded corners should be displayed
    calculateEffectiveRounded() {
        // use normalized numeric value here
        const numericValue = this.getValidNumericValue(this.data.value);
        return this.userRounded && numericValue >= 10;
    },

    updateProgressBarColor() {        
        if (this.shadowMesh) {
            if (this.data.state !== "") {
                this.shadowMesh.material.color.set(this.finalColor);
            } else if (this.data.mode !== "" && this.data.state === "" && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "")) {
                this.setMode();
                this.shadowMesh.material.color.set(this.finalColor);
            } else if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
                this.finalColor = this.data.color;
                this.shadowMesh.material.color.set("#000");
            } else {
                this.finalColor = PRIMARY_COLOR_DARK;
                this.shadowMesh.material.color.set("#000");
            }
        } 
        if (this.progressBarMesh) {
            this.progressBarMesh.material.color.set(this.finalColor);
        }
        this.updateProgressBarOpacity();

        // Re-evaluate the text color based on the new background color
        this.updateTextColor();
    },

    updateProgressBarOpacity() {
        const opacityValue = this.data.opacity;
        if (this.progressBarMesh) this.progressBarMesh.material.opacity = opacityValue;
        if (this.shadowMesh) this.shadowMesh.material.opacity = opacityValue * 0.65;
    },

    updateTextColor() {
        // If the mode or state are used, ignore the text color
        if ((this.data.state !== "") || ((this.data.mode === 'light' || this.data.mode === 'dark') &&
            (this.data.color === PRIMARY_COLOR_DARK || this.data.color === ""))) return;

        const progressBarColorHex = this.progressBarMesh ? `#${this.progressBarMesh.material.color.getHexString()}` : null;
        const shadowColorHex = `#${this.shadowMesh.material.color.getHexString()}`;
        let textcolor = this.data.textcolor;

        // Use normalized numeric value so non-numeric inputs don't break logic
        const numericValue = this.getValidNumericValue(this.data.value);

        // Determine the background color based on the (validated) value
        const backgroundColorHex = numericValue < 20 ? shadowColorHex : progressBarColorHex;

        // Calculate contrast
        const contrast = getContrast(textcolor, backgroundColorHex);

        // If the contrast is not high enough, adjust the text color
        if (contrast <= 60) {
            const newTextColor = setContrastColor(backgroundColorHex);

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
    },

    updateTextVisibility() {
        const textEl = this.el.querySelector("a-text");
        let visibility = this.data.textvisibility;
        if (textEl) {
            textEl.setAttribute("visible", visibility);
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

            default:
                break
        }
        this.el.setAttribute('sizeCoef',sizeCoef)
    },

    getValidNumericValue(value) {
        let numericValue = parseFloat(value);
        if (isNaN(numericValue) || !isFinite(numericValue)) {
            numericValue = 0;
        }
        return Math.max(0, Math.min(100, numericValue));
    },

    createProgressBar(widthArg = 4, heightArg = 0.4){
        const sizeCoef = this.el.getAttribute('sizeCoef')
        const group = new AFRAME.THREE.Group();

        const height = heightArg * sizeCoef;
        let borderRadius;

        let numericValue = this.getValidNumericValue(this.data.value);
        
        if (numericValue < 4) {
            borderRadius = 0.03; // No rounding for very small values, because the shape would be distorted
        } else {
            borderRadius = this.effectiveRounded ? 0.2 * sizeCoef : 0.08 * sizeCoef;
        }

        const max_width = widthArg * sizeCoef
        let width = max_width * (numericValue / 100) // Use numericValue instead of this.data.value
        
        // If the value is set to more than 100, display error and set to 100
        if (numericValue > 100){
            width = max_width;
            numericValue = 100;
            console.log("The value can't be more than 100, so it was set to maximum of one hundred percent.");
        }

        this.width = width

        const opacityValue = this.data.opacity;
    
        if (numericValue > 0) {
                // Create a main ProgressBar mesh
                const progressBarShape = createRoundedRectShape(width, height, borderRadius)

                const progressBarGeometry  = new AFRAME.THREE.ExtrudeGeometry(
                    progressBarShape,
                    { depth: 0.01, bevelEnabled: false }
                );

                const progressBarMaterial = new AFRAME.THREE.MeshBasicMaterial({
                    color: this.finalColor,
                    opacity: opacityValue,
                    transparent: true
                })

                const progressBarMesh = new AFRAME.THREE.Mesh(progressBarGeometry, progressBarMaterial)
                
                const x_axis = 0 - max_width/2 + width/2;
                progressBarMesh.position.set(x_axis, 0, 0)

                this.progressBarMesh = progressBarMesh

                group.add(progressBarMesh);
        }


        // Create shadow effect with a slightly larger rectangle as the background
        const shadowWidth = max_width + sizeCoef * 0.15; 
        const shadowHeight = height + sizeCoef * 0.12; 
        const shadowBorderRadius = borderRadius + sizeCoef * 0.05;

        const shadowShape = createRoundedRectShape(shadowWidth, shadowHeight, shadowBorderRadius);
        const shadowGeometry = new AFRAME.THREE.ShapeGeometry(shadowShape);
        const shadowMaterial = new AFRAME.THREE.MeshBasicMaterial({
            color:'#000',
            opacity: opacityValue * 0.65,
            transparent: true
        });

        const shadowMesh = new AFRAME.THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowMesh.position.set(0, 0, -0.01); // Place it just behind the progress bar
        this.shadowMesh = shadowMesh;

        group.add(shadowMesh);

        this.el.setObject3D('mesh', group);
    },

    reverseProgressBar() {
        const sizeCoef = this.el.getAttribute('sizeCoef');
        let reversed = this.data.reversed;
        const max_width = 4 * sizeCoef;

        let numericValue = this.getValidNumericValue(this.data.value);
        
        const width = max_width * (numericValue / 100);      
        let x_axis = 0;
        if (!reversed) {
            x_axis = 0 - max_width / 2 + width / 2;
        } else {
            x_axis = 0 + max_width / 2 - width / 2;
        }

        if (this.progressBarMesh) {
            this.progressBarMesh.position.set(x_axis, 0, 0);
        }

        // Ensure mode is reapplied correctly when reversed changes
        if (this.data.mode !== "" && this.data.state === "" && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "")) {
            this.setMode();
        } else {
            this.updateProgressBarColor();
        }
    },

    setContent() {
        let numericValue = this.getValidNumericValue(this.data.value);
        
        let text;
        if (numericValue >= 100) {
            text = "100 %";
        } else if (numericValue <= 0) {
            text = "0 %";
        } else {
            // limit to max 3 decimals, remove unnecessary trailing zeros
            const rounded = Math.round(numericValue * 1000) / 1000;
            const display = parseFloat(rounded.toFixed(3)).toString();
            text = `${display} %`;
        }

        // Log when rounding state changes
        if (this.userRounded) {
            if (numericValue < 10 && this.effectiveRounded) {
                console.log("Rounded corners removed because value is less than 10");
            } else if (numericValue >= 10 && !this.effectiveRounded) {
                console.log("Rounded corners applied because value is now 10 or greater");
            }
        }

        const sizeCoef = this.el.getAttribute('sizeCoef')
        let reversed = this.data.reversed

        let textEl = this.el.querySelector("a-text")
        if(textEl) textEl.remove();

        textEl = document.createElement("a-text")
        textEl.setAttribute("visible", this.data.textvisibility)
        textEl.setAttribute("value", text === undefined ? "" : text)
        textEl.setAttribute("align", "center")
        textEl.setAttribute('scale', {x: 0.7 * sizeCoef, y: 0.7 * sizeCoef , z: 0.7 * sizeCoef});
        textEl.setAttribute("position", '0 0 0.05')
        
        // Create the progress bar and calculate its x-axis
        this.createProgressBar();
        const max_width = 4 * sizeCoef;
        const width = this.progressBarMesh ? max_width * (numericValue / 100) : 0; // Fallback to 0 if progressBarMesh is not defined, in that way x_axis will be calculated correctly
        let x_axis = 0
        let positionForDecimal = 0; // Adjustment  in text for decimal numbers
        if (String(numericValue).includes('.')) {
            numericValue < 5 ? positionForDecimal = width/2 + 0.1 : positionForDecimal = width/2 // Adjust for decimal point
        }

        if (!reversed) {
            if (numericValue >= 20) {
                // Set the position of the text element to match the progress bar's center
                x_axis = 0 - max_width / 2 + width / 2;   
            } else {
                // Set the position of the text element to match on the right side progress bar with padding
                x_axis = 0 - max_width / 2 + width + 0.25 + positionForDecimal;
            }
        } else {
            if (numericValue >= 20) {
                x_axis = 0 + max_width / 2 - width / 2;
            } else {
                x_axis = 0 + max_width / 2 - width - 0.25 - positionForDecimal;
            }
        }

        textEl.setAttribute("position", { x: x_axis, y: 0, z: 0.05 });

        this.reverseProgressBar();

        // Ensure text color is updated after reversing
        if (textEl && this.data.state !== "") {
            textEl.setAttribute("color", this.data.state === "disabled" ? "black" : "white");
        } else if (textEl && this.data.mode !== "") {
            textEl.setAttribute("color", this.data.mode === "light" ? "black" : "white");
        }

        this.el.appendChild(textEl);

        this.updateTextColor();
    },


    setMode() {
        const shadowMesh = this.shadowMesh;

        // If state or custom color is set, ignore the mode
        if (this.data.state !== "" || (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "")) {
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
                return;
        }

        // Apply the mode color to the progress bar and shadow
        if (this.progressBarMesh) {
            this.progressBarMesh.material.color.set(this.finalColor);
        }
        if (shadowMesh) {
            shadowMesh.material.color.set(this.finalColor);
            shadowMesh.material.opacity = 0.65;
            shadowMesh.material.transparent = true;
        }

        // Update text color based on mode
        const textEl = this.el.querySelector("a-text");
        if (textEl) {
            textEl.setAttribute("color", this.data.mode === "light" ? "black" : "white");
        }
    },


    setState() {
        const shadowMesh = this.shadowMesh;
        // If state is set, ignore color and mode
        // Priority(lowet -> highest): mode -> color -> state

        switch (this.data.state) {
            case "success":
                this.el.setAttribute("material", { color: SUCCESS_COLOR, opacity: 1 })
                this.el.querySelector("a-text").setAttribute("color", "white")
                // Adjust final color to match the state
                this.finalColor = SUCCESS_COLOR
                if (shadowMesh) {
                    shadowMesh.material.color.set(SUCCESS_COLOR);
                    shadowMesh.material.opacity = 0.65
                    // Make sure material is transparent to display opacity
                    shadowMesh.material.transparent = true;
                }
                break;
            case "warning":
                this.el.setAttribute("material", { color: WARNING_COLOR, opacity: 1 })
                this.el.querySelector("a-text").setAttribute("color", "white")
                // Adjust final color to match the state
                this.finalColor = WARNING_COLOR
                if (shadowMesh) {
                    shadowMesh.material.color.set(WARNING_COLOR);
                    shadowMesh.material.opacity = 0.65;
                    // Make sure material is transparent to display opacity
                    shadowMesh.material.transparent = true;
                }
                break;
            case "error":
                this.el.setAttribute("material", { color: ERROR_COLOR, opacity: 1 })
                this.el.querySelector("a-text").setAttribute("color", "white")
                // Adjust final color to match the state
                this.finalColor = ERROR_COLOR
                if (shadowMesh) {
                    shadowMesh.material.color.set(ERROR_COLOR);
                    shadowMesh.material.opacity = 0.65;
                    // Make sure material is transparent to display opacity
                    shadowMesh.material.transparent = true;
                }
                break;
            case "disabled":
                this.el.setAttribute("material", { color: DISABLED_COLOR, opacity: 1 })
                this.el.querySelector("a-text").setAttribute("color", "black")
                // Adjust final color to match the state
                this.finalColor = DISABLED_COLOR
                if (shadowMesh) {
                    shadowMesh.material.color.set(DISABLED_COLOR);
                    shadowMesh.material.opacity = 0.65;
                    // Make sure material is transparent to display opacity
                    shadowMesh.material.transparent = true;
                }
                break;
            case "indicating":
                // left for further development
                break;
            default:
                break;
        }

        // Update ProgressBar color after the state color has been set
        this.updateProgressBarColor();
    },

})
