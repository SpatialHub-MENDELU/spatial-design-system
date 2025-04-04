import * as AFRAME from "aframe"
import * as TWEEN from '@tweenjs/tween.js';
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import { createRoundedRectShape, getContrast, setContrastColor} from "../utils/utils.js"
import "../primitives/ar-button.js" 

AFRAME.registerComponent("dialog", {
    schema: {
        opacity: { type: "number", default: 1},
        primary: { type: "string", default: PRIMARY_COLOR_DARK},
        variant: { type: "string", default: "light"},
        textcolor: { type: "string", default: "black"},
        prependicon: { type: "string", default: ""},
        closingicon: { type: "boolean", default: false},
        title: { type: "string", default: "Dialog" },
        content: { type: "string", default: "This is the example of basic dialog component." },
        buttons: { type: "array", default: ["Close"] },
        persistent: { type: 'boolean', default: false },
        autoclose: { type: 'boolean', default: false },
        seamless: { type: 'boolean', default: false },
        backdropfilter: { type: 'string', default: "" },
        transition: { type: 'string', default: "" },
    },

    init() {
        this.el.setAttribute("flexbox", "...")
        this.setContent()
        this.setVariant()
    },

    update(oldData) {
        // Skip the update for the first time since init() handles the initial setup
        if (!oldData.primary) return;
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'opacity':
                    this.updateDialogOpacity();
                    break;
                case 'color':
                    this.updateDialogColor();
                    break;
                case 'variant':
                    this.setVariant();
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
        const group = new AFRAME.THREE.Group();

        const width = widthArg
        const height = heightArg
        let  borderRadius = 0.12
        this.width = width
        let opacityValue = this.data.opacity;

        // Create a main dialog mesh
        const dialogShape = createRoundedRectShape(width, height, borderRadius)
        const dialogGeometry  = new AFRAME.THREE.ExtrudeGeometry(
            dialogShape,
            { depth: 0.01, bevelEnabled: false }
        );

        const dialogMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.primary, 
            opacity: opacityValue, 
            transparent: true
        })

        const dialogMesh = new AFRAME.THREE.Mesh(dialogGeometry, dialogMaterial)
        this.dialogMesh = dialogMesh

        group.add(dialogMesh);
        this.el.setObject3D('mesh', group);
        this.el.setAttribute("visible", false);
    },

    setContent() {
        let title = this.data.title
        let content = this.data.content

        let titleEl = this.el.querySelector("#title")
        if(titleEl) titleEl.remove();
        titleEl = document.createElement("a-text")
        titleEl.setAttribute("id", "title")
        titleEl.setAttribute("value", title === undefined ? "" : title)
        titleEl.setAttribute("align", "left")
        titleEl.setAttribute('scale', {x: 0.7 , y: 0.7, z: 0.7});
        //titleEl.setAttribute("lineHeight", 0.7)
        //titleEl.setAttribute("width", 0.7)
        titleEl.setAttribute("position", {x: -1.3, y: 0.7, z: 0.05})

        let contentEl = this.el.querySelector("#content")
        if(contentEl) contentEl.remove();
        contentEl = document.createElement("a-text")
        contentEl.setAttribute("id", "content") 
        contentEl.setAttribute("value", content === undefined ? "" : content)
        contentEl.setAttribute("align", "center")
        contentEl.setAttribute("wrap-count", 40)
        contentEl.setAttribute("width", 4)       
        contentEl.setAttribute('scale', {x: 0.7, y: 0.7, z: 0.7});
        contentEl.setAttribute("position", {x: 0, y: 0.4, z: 0.05})
        
        this.createDialog() 
        this.el.appendChild(titleEl)
        this.el.appendChild(contentEl)

        //this.updateIconPosition(iconpos)
        this.updateTextColor();
        this.setButtons();
    },

    setVariant() {
        const shadowMesh = this.shadowMesh;
        //If primary is set ignore the variant
        if (this.data.primary !== PRIMARY_COLOR_DARK) {
            return;
        }
        switch (this.data.variant) {
            case "light":
                this.el.setAttribute("material", { color: VARIANT_LIGHT_COLOR, opacity: 1 })
                this.el.querySelector("#title").setAttribute("color", "black");
                this.el.querySelector("#content").setAttribute("color", "black");
                // Adjust primary color to match the variant
                this.data.primary = VARIANT_LIGHT_COLOR
                if (shadowMesh) {
                    shadowMesh.material.color.set(VARIANT_LIGHT_COLOR);
                    shadowMesh.material.opacity = 0.65;
                    // Make sure material is transparent to display opacity
                    shadowMesh.material.transparent = true;
                }
                break;
                case "dark":
                    this.el.setAttribute("material", { color: VARIANT_DARK_COLOR, opacity: 1 });
                    this.el.querySelector("#title").setAttribute("color", "white");
                    this.el.querySelector("#content").setAttribute("color", "white");
                    // Adjust primary color to match the variant
                    this.data.primary = VARIANT_DARK_COLOR;
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
        // Update button color after the variant color has been set
        this.updateDialogColor();
    },

    updateDialogColor() {
        this.dialogMesh.material.color.set(this.data.primary);
        if (this.shadowMesh) this.shadowMesh.material.color.set(this.data.primary);
    },

    updateTextColor() {
        // If variant will be used, ignore the textcolor
        if ((this.data.variant === 'light' || this.data.variant === 'dark') 
            && this.data.color === PRIMARY_COLOR_DARK) return;
    
            const dialogColorHex = `#${this.dialogMesh.material.color.getHexString()}`
            let textcolor = this.data.textcolor
    
            // If the contrast is not high enough, set the textcolor to white/black
            if (getContrast(textcolor, dialogColorHex) <= 60){
                textcolor = setContrastColor(dialogColorHex);
                this.data.textcolor = textcolor;
                alert(`DIALOGThe text color you set does not have enough contrast. It has been set to ${textcolor} color for better visibility.`);
            }
            const titleEl = this.el.querySelector("#title");
            if (titleEl) {
                titleEl.setAttribute("color", textcolor);
            }
            const contentEl = this.el.querySelector("#content");
            if (contentEl) {
                contentEl.setAttribute("color", textcolor);
            }
    },

    updateDialogOpacity() {
        const opacityValue = this.data.opacity;
        this.dialogMesh.material.opacity = opacityValue;
        //if (this.shadowMesh) this.shadowMesh.material.opacity = opacityValue * 0.65;
    },

    setButtons() {
        let buttons = this.data.buttons;

        if (buttons.length > 2) {
            //alert(`The dialog can have a maximum of 2 buttons. That's why your other buttons have been removed.`);
            buttons = buttons.slice(0, 2); // Keep only the first two buttons
        }
    
        buttons.forEach((buttonText, index) => {
            let buttonEl = document.createElement("a-ar-button");
            buttonEl.setAttribute("content", buttonText);
            buttonEl.setAttribute("size", "medium");
            buttonEl.setAttribute("textonly", true);
            buttonEl.setAttribute("uppercase", true);
            //buttonEl.addEventListener("click", () => this.handleButtonClick(buttonText));
            buttonEl.addEventListener("click", () => this.closeDialog());

            if (index == 1) {
                buttonEl.setAttribute("position", { x: 1, y: -0.7, z: 0.07 });
            } else {
                buttonEl.setAttribute("position", { x: 0.3, y: -0.7, z: 0.07 });

            }

            this.el.appendChild(buttonEl);
        });
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