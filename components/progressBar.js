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
        this.setSize()
        this.setContent()
        this.setMode()
        this.setState()
        this.finalColor = PRIMARY_COLOR_DARK;
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
                case 'reversed':
                    this.reverseProgressBar();
                case 'rounded':
                    this.setContent();
                    break;
                case 'value':
                    this.setContent();
                    break;
                case 'textcolor':
                    this.updateTextColor();
                    break;
                case 'textvisibility':
                    this.updateTextVisibility();
                    break;
                case 'mode':
                    this.setMode();
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

    updateProgressBarColor() {        
        if (this.shadowMesh) {
            if (this.data.state != "") {
                this.shadowMesh.material.color.set(this.finalColor);
            } else if (this.data.mode != "") {
                if (this.data.color != PRIMARY_COLOR_DARK) {
                    this.finalColor = this.data.color;
                    this.shadowMesh.material.color.set("#000");
                } else {
                    this.shadowMesh.material.color.set(this.finalColor);
                }
            } else if (this.data.color != PRIMARY_COLOR_DARK) {
                this.finalColor = this.data.color;
                this.shadowMesh.material.color.set("#000");
            } else {
                this.finalColor = PRIMARY_COLOR_DARK;
                this.shadowMesh.material.color.set("#000");
            }
        } 
        this.progressBarMesh.material.color.set(this.finalColor);
        this.updateProgressBarOpacity();
    },

    updateProgressBarOpacity() {
        const opacityValue = this.data.opacity;
        this.progressBarMesh.material.opacity = opacityValue;
        if (this.shadowMesh) this.shadowMesh.material.opacity = opacityValue * 0.65;
    },

    updateTextColor() {
        // If mode will be used, ignore the textcolor
        if (this.data.mode === 'light' || this.data.mode === 'dark') return;

        const progressBarColorHex = `#${this.progressBarMesh.material.color.getHexString()}`
        const shadowColorHex = `#${this.shadowMesh.material.color.getHexString()}`
        let textcolor = this.data.textcolor
        // if value is less than 20 text will not be on the bar but on the background
        // that's way we need the contrast with shadow
        let contrast = this.data.value < 20 ? getContrast(textcolor, shadowColorHex) : getContrast(textcolor, progressBarColorHex)

        // If the contrast is not high enough, set the textcolor to white/black
        if (contrast <= 60){
            textcolor = setContrastColor(contrast);
            this.data.textcolor = textcolor;
            alert(`The text color you set does not have enough contrast. It has been set to ${textcolor} color for better visibility.`);
        }
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

    createProgressBar(widthArg = 4, heightArg = 0.4){
        const sizeCoef = this.el.getAttribute('sizeCoef')
        const group = new AFRAME.THREE.Group();

        const height = heightArg * sizeCoef
        let  borderRadius = 0.08 * sizeCoef
        const max_width = widthArg * sizeCoef
        let width = max_width * (this.data.value / 100)
        // If the value is set to more then 100, display error and set to 100
        if (this.data.value > 100){
            width = max_width;
            this.data.value = 100;
            alert(`The value can't be more then 100, so it was set to maximum of one hundred percent.`);
        }

        if (this.data.rounded) {
            borderRadius = 0.2 * sizeCoef;
        }

        this.width = width

        const opacityValue = this.data.opacity;
    
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
        const sizeCoef = this.el.getAttribute('sizeCoef')
        let reversed = this.data.reversed
        const max_width = 4 * sizeCoef;
        const width = max_width * (this.data.value / 100);
        let x_axis = 0

        if (!reversed) {
            x_axis = 0 - max_width/2 + width/2;
        } else {
            x_axis = 0 + max_width/2 - width/2;
        }
        
        this.progressBarMesh.position.set(x_axis, 0, 0)
    },

    setContent() {
        let text = String(this.data.value) + " %"
        if (this.data.value > 100) {
            text = "100 %"
        }

        if (this.data.rounded && this.data.value < 10) {
            this.data.rounded = false;
            alert(`The progress bar can't be rounded, if the value of progression is less than 10`);
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
        const width = max_width * (this.data.value / 100);
        let x_axis = 0

        if (!reversed) {
            if (this.data.value >= 20) {
                // Set the position of the text element to match the progress bar's center
                x_axis = 0 - max_width / 2 + width / 2;   
            } else {
                // Set the position of the text element to match on the right side progress bar with padding
                x_axis = 0 - max_width / 2 + width + 0.25;
            }
        } else {
            if (this.data.value >= 20) {
                x_axis = 0 + max_width / 2 - width / 2;   
            } else {
                x_axis = 0 + max_width / 2 - width - 0.25;
            }
        }

        textEl.setAttribute("position", { x: x_axis, y: 0, z: 0.05 });

        this.reverseProgressBar()

        this.el.appendChild(textEl)

        this.updateTextColor();
    },


    setMode() {
        const shadowMesh = this.shadowMesh;
        
        //If color is set ignore the mode
        if (this.data.color !== PRIMARY_COLOR_DARK) {
            return;
        }

        switch (this.data.mode) {
            case "light":
                this.el.setAttribute("material", { color: VARIANT_LIGHT_COLOR, opacity: 1 })
                this.el.querySelector("a-text").setAttribute("color", "black")
                // Adjust final color to match the mode
                this.finalColor = VARIANT_LIGHT_COLOR
                if (shadowMesh) {
                    shadowMesh.material.color.set(VARIANT_LIGHT_COLOR);
                    shadowMesh.material.opacity = 0.65;
                    // Make sure material is transparent to display opacity
                    shadowMesh.material.transparent = true;
                }
                break;
            case "dark":
                this.el.setAttribute("material", { color: VARIANT_DARK_COLOR, opacity: 1 });
                this.el.querySelector("a-text").setAttribute("color", "white");
                // Adjust final color to match the mode
                this.finalColor = VARIANT_DARK_COLOR;
                if (shadowMesh) {
                    shadowMesh.material.color.set(VARIANT_DARK_COLOR);
                    shadowMesh.material.opacity = 0.65;
                    // Make sure material is transparent to display opacity
                    shadowMesh.material.transparent = true;
                }
                break;
            default:
                break;
        }

        // Update progress bar color after the mode color has been set
        this.updateProgressBarColor();
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
