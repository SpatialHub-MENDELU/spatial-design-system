import * as AFRAME from "aframe"
import * as TWEEN from '@tweenjs/tween.js';
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import { createRoundedRectShape, getContrast, setContrastColor} from "../utils/utils.js"

AFRAME.registerComponent("button", {
    schema: {
        text: { type: "string", default: "" },
        opacity: { type: "number", default: 1 },
        icon: { type: "string", default: ""},
        iconpos: { type: "string", default: "left"},
        size: { type: "string", default: "medium"},
        contentsize: { type: "number", default: 1},
        textcolor: { type: "string", default: "black"},
        variant: { type: "string", default: ""},
        primary: { type: "string", default: PRIMARY_COLOR_DARK},
        uppercase: { type: "boolean", default: false },
        rounded: { type: "boolean", default: false },
        textonly: { type: "boolean", default: false },
        outlined: { type: 'boolean', default: false },
    },

    init() {
        this.setSize()
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
                case 'size':
                    this.setSize();
                    this.setContent();
                    break;
                case 'text':
                case 'icon':
                case 'uppercase':
                case 'textonly':
                case 'outlined':
                case 'rounded':
                    this.setContent();
                    break;
                case 'textcolor':
                    this.updateTextColor(); 
                    break;
                case 'variant':
                    this.setVariant();
                    break;
                case 'primary':
                    if (this.data.variant === '') {
                        this.updateButtonColor();
                    }
                    break;
                case 'opacity':
                    this.updateButtonOpacity();
                    break;
                case 'iconpos':
                    this.updateIconPosition(this.data.iconpos);
                    break;
                default:
                    break;
            }
        });
    },

    updateButtonColor() {
        this.buttonMesh.material.color.set(this.data.primary);
        if (this.shadowMesh) this.shadowMesh.material.color.set(this.data.primary);
        if (this.outlineMesh) this.outlineMesh.material.color.set(this.data.primary);   
    },

    updateButtonOpacity() {
        const opacityValue = this.data.textonly ? 0.1 : this.data.opacity;
        this.buttonMesh.material.opacity = opacityValue;
        if (this.shadowMesh) this.shadowMesh.material.opacity = opacityValue * 0.6;
    },

    updateTextColor() {
        // If variant will be used, ignore the textcolor
        if ((this.data.variant === 'light' || this.data.variant === 'dark') 
        && this.data.primary === PRIMARY_COLOR_DARK) return;

        const buttonColorHex = `#${this.buttonMesh.material.color.getHexString()}`
        let textcolor = this.data.textcolor

        // If the contrast is not high enough, set the textcolor to white/black
        if (getContrast(textcolor, buttonColorHex) <= 60){
            textcolor = setContrastColor(buttonColorHex);
            this.data.textcolor = textcolor;
            console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} color for better visibility.`);
        }
        const textEl = this.el.querySelector("a-text");
        if (textEl) {
            textEl.setAttribute("color", textcolor);
        }
    },

    updateIconPosition(iconpos) {
        const sizeCoef = this.el.getAttribute('sizeCoef')

        let textEl = this.el.querySelector("a-text")
        let iconEl = this.el.querySelector("a-image")
        if(iconEl) {
            iconEl.remove();
        }

        const icon = this.data.icon === "" ? "" : this.data.icon
        const iconWidth = icon !== "" && !this.data.textonly ? 0.2 * this.el.getAttribute('sizeCoef') : 0

        if(icon !== "" && !this.data.textonly) {
            iconEl = document.createElement("a-image")

            // Have to be loaded like this, otherwise the icon shows error
            // First I have to make sure the image exists before I can use it
            var myImg = new Image;
            myImg.src = icon;
            myImg.onload = () => {
                let textXPosition;
                let iconXPosition;
                if (iconpos === "right") {
                    textXPosition = -iconWidth * 0.5;
                    iconXPosition = this.width * 0.5 - 0.17 * sizeCoef;
                } else {
                    textXPosition = iconWidth * 0.5;
                    iconXPosition = -this.width * 0.5 + 0.18 * sizeCoef;
                }

                // If no text is passed, display the icon in the middle
                if (this.data.text === "") iconXPosition = 0;
                
                // moving the text to the right, so it doesnt hide the icon
                textEl.setAttribute("position", { x: textXPosition, y: 0, z: 0.05 })
                
                iconEl.setAttribute("geometry", { width: iconWidth, height: 0.2 * this.el.getAttribute('sizeCoef')})
                iconEl.setAttribute("position", { x: iconXPosition, y: 0, z: 0.02 })
                iconEl.setAttribute("material", { src: icon })
                this.el.appendChild(iconEl)
            }
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
            
            case "extra-large":
                sizeCoef = 3
                break;

            default:
                break
        }
        this.el.setAttribute('sizeCoef',sizeCoef)
    },

    createButton(widthArg = 1, heightArg = 0.4){
        const sizeCoef = this.el.getAttribute('sizeCoef')
        const group = new AFRAME.THREE.Group();

        const width = widthArg * sizeCoef
        const height = heightArg * sizeCoef
        let  borderRadius = 0.08 * sizeCoef

        if (this.data.rounded) {
            borderRadius = 0.2 * sizeCoef;
        }

        this.width = width

        let opacityValue;
        if (this.data.textonly) {
            opacityValue = 0.0;
        } else if (this.data.outlined) {
            opacityValue = 0.05;
        } else {
            opacityValue = this.data.opacity;
        }

        // Create a main button mesh
        const buttonShape = createRoundedRectShape(width, height, borderRadius)
        // Using ExtrudeGeometry to properly display border when using outlined prop is true
        const buttonGeometry  = new AFRAME.THREE.ExtrudeGeometry(
            buttonShape,
            { depth: 0.01, bevelEnabled: false }
        );
        if (this.data.outlined) buttonGeometry.translate(0, 0, -0.005);

        const buttonMaterial = new AFRAME.THREE.MeshBasicMaterial({ 
            color: this.data.primary, 
            opacity: opacityValue, 
            transparent: true
        })

        const buttonMesh = new AFRAME.THREE.Mesh(buttonGeometry, buttonMaterial)
        this.buttonMesh = buttonMesh

        group.add(buttonMesh);

        // Create an outline if outlined is true
        if (this.data.outlined && !this.data.textonly) {
            const borderSize = 0.04 * sizeCoef;
            const outlineShape = createRoundedRectShape(width + borderSize, height + borderSize, borderRadius + 0.024);
            const outlineGeometry = new AFRAME.THREE.ShapeGeometry(outlineShape);
            const outlineMaterial = new AFRAME.THREE.MeshBasicMaterial({
                color: this.data.primary,
                opacity: 0.5,
                transparent: true
            });
            const outlineMesh = new AFRAME.THREE.Mesh(outlineGeometry, outlineMaterial);
            outlineMesh.position.z -= 0.05;

            this.outlineMesh = outlineMesh;
            group.add(outlineMesh);
        }

        // Create a shadow if textonly is false and outlined is false
        if (!this.data.textonly && !this.data.outlined) { 
            const shadowGeometry = new AFRAME.THREE.ShapeGeometry(buttonShape);
            const shadowMaterial = new AFRAME.THREE.MeshBasicMaterial({
                color: this.data.primary,
                opacity: 0.6 * opacityValue,
                transparent: true
            });
            const shadowMesh = new AFRAME.THREE.Mesh(shadowGeometry, shadowMaterial);
            const moveButtonCoef = width / 36;
            shadowMesh.position.set(moveButtonCoef, -moveButtonCoef, -0.01);
            this.shadowMesh = shadowMesh;
            group.add(shadowMesh);
        }
        this.el.setObject3D('mesh', group);
    },

    setContent() {
        const icon = this.data.icon === "" ? "" : this.data.icon
        const iconpos = this.data.iconpos
        let text = this.data.text
        const sizeCoef = this.el.getAttribute('sizeCoef')
        let capsCoef = 1;

        if (this.data.uppercase) {
            text = text.toUpperCase();
            capsCoef = 0.9;
        }

        let textEl = this.el.querySelector("a-text")
        if(textEl) textEl.remove();

        textEl = document.createElement("a-text")
        textEl.setAttribute("value", text === undefined ? "" : text)
        textEl.setAttribute("align", "center")
        textEl.setAttribute('scale', {x: 0.7 * sizeCoef * capsCoef, y: 0.7 * sizeCoef * capsCoef, z: 0.7 * sizeCoef * capsCoef});
        textEl.setAttribute("position", '0 0 0.05')

        // If there is an icon, the button has to be wider
        const iconWidth = icon !== "" && !this.data.textonly ? 0.2 * this.el.getAttribute('sizeCoef') : 0

        // If the text is longer than 8 chars, the button has to be wider
        // Have to create a new button, if using button.scale.set(), the border radius will not scale
        const defaultLetterWidth = 0.08;
        this.createButton(0.9 + defaultLetterWidth  * (text.length - 8) + iconWidth * 0.7)
        
        this.el.appendChild(textEl)

        this.updateIconPosition(iconpos)
        this.updateTextColor();

        this.el.setAttribute('class', 'clickable')
        this.el.addEventListener("click", () => {
            this.animateButtonOnClick();
        })
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
                this.el.querySelector("a-text").setAttribute("color", "black")
                // Adjust primary color to match the variant
                this.data.primary = VARIANT_LIGHT_COLOR
                if (shadowMesh) {
                    shadowMesh.material.color.set(VARIANT_LIGHT_COLOR);
                    shadowMesh.material.opacity = 1 * 0.66;
                    // Make sure material is transparent to display opacity
                    shadowMesh.material.transparent = true;
                }
                break;
                case "dark":
                    this.el.setAttribute("material", { color: VARIANT_DARK_COLOR, opacity: 1 });
                    this.el.querySelector("a-text").setAttribute("color", "white");
                    // Adjust primary color to match the variant
                    this.data.primary = VARIANT_DARK_COLOR;
                    if (shadowMesh) {
                        shadowMesh.material.color.set(VARIANT_DARK_COLOR);
                        shadowMesh.material.opacity = 1 * 0.66;
                        // Make sure material is transparent to display opacity
                        shadowMesh.material.transparent = true;
                    }
                    break;
            default:
                break;
        }
        // Update button color after the variant color has been set
        this.updateButtonColor();
    },

    animateButtonOnClick() {
        const originalColor = new THREE.Color(this.data.primary);
        const darkerColor = new THREE.Color('#666666');
        const buttonMesh = this.buttonMesh;
        const shadowMesh = this.shadowMesh;

        // Using aframe animations for button and its children scale (pic, text..)
        // Using tween.js for color change due to problems with aframe color animations

        const elScale = this.el.object3D.scale.clone();

        const pressAnimation = {
            property: 'scale',
            to: { x: elScale.x * 0.9, y: elScale.y * 0.9, z: elScale.z * 0.9 },
            dur: 100,
            easing: 'easeInOutQuad'
        };
        this.el.setAttribute('animation__click', pressAnimation);
    
    
        new TWEEN.Tween(buttonMesh.material.color)
            .to({ r: darkerColor.r, g: darkerColor.g, b: darkerColor.b }, 100)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                buttonMesh.material.color.setRGB(buttonMesh.material.color.r, buttonMesh.material.color.g, buttonMesh.material.color.b);
            })
            .start();
    
        if (shadowMesh) {
            new TWEEN.Tween(shadowMesh.material.color)
                .to({ r: darkerColor.r, g: darkerColor.g, b: darkerColor.b }, 100)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    shadowMesh.material.color.setRGB(shadowMesh.material.color.r, shadowMesh.material.color.g, shadowMesh.material.color.b);
                })
                .start();
        }
    
        setTimeout(() => {
            const releaseAnimation = { ...pressAnimation, to: { x: elScale.x, y: elScale.y, z: elScale.z } };
            this.el.setAttribute('animation__click', releaseAnimation);
    
            new TWEEN.Tween(buttonMesh.material.color)
                .to({ r: originalColor.r, g: originalColor.g, b: originalColor.b }, 100)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    buttonMesh.material.color.setRGB(buttonMesh.material.color.r, buttonMesh.material.color.g, buttonMesh.material.color.b);
                })
                .start();
    
            if (shadowMesh) {
                new TWEEN.Tween(shadowMesh.material.color)
                    .to({ r: originalColor.r, g: originalColor.g, b: originalColor.b }, 100)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onUpdate(() => {
                        shadowMesh.material.color.setRGB(shadowMesh.material.color.r, shadowMesh.material.color.g, shadowMesh.material.color.b);
                    })
                    .start();
            }
        }, 100);
    
        function animate() {
            requestAnimationFrame(animate);
            TWEEN.update();
        }
    
        animate();
    }
    

})