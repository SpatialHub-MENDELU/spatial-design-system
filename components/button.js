import * as AFRAME from "aframe";
import "aframe-troika-text";
import * as TWEEN from "@tweenjs/tween.js";
import {
  PRIMARY_COLOR_DARK,
  VARIANT_DARK_COLOR,
  VARIANT_LIGHT_COLOR,
} from "../utils/colors.js";
import {
  createPartiallyRoundedRectShape,
  getContrast,
  setContrastColor,
} from "../utils/utils.js";
import { determineHighlightedColor } from "../utils/colors.js";

AFRAME.registerComponent("button", {
  schema: {
    size: { type: "string", default: "medium" },
    opacity: { type: "number", default: 1 },
    color: { type: "string", default: PRIMARY_COLOR_DARK },
    mode: { type: "string", default: "" },
    text: { type: "string", default: "" },
    textcolor: { type: "string", default: "black" },
    icon: { type: "string", default: "" },
    iconpos: { type: "string", default: "left" },
    contentsize: { type: "number", default: 1 },
    uppercase: { type: "boolean", default: false },
    rounded: { type: "boolean", default: false },
    roundedsides: { type: "string", default: "full" },
    textonly: { type: "boolean", default: false },
    outlined: { type: "boolean", default: false },
    elevated: { type: "boolean", default: true }, // Button has shadow by default
    tile: { type: "boolean", default: false },
  },

  init() {
    this.finalColor = this.data.color;

    this.setSize();
    this.setContent();
    this.setMode();
    this.updateButtonColor();
  },

  update(oldData) {
    // Skip the update for the first time since init() handles the initial setup
    if (!oldData.color) return;

    // Checking which properties have changed and executing the appropriate functions
    const changedProperties = Object.keys(this.data).filter(
      (property) => this.data[property] !== oldData[property]
    );
    changedProperties.forEach((property) => {
      switch (property) {
        case "size":
          this.setSize();
          this.setContent();
          break;
        case "icon":
        case "iconpos":
        case "uppercase":
        case "rounded":
        case "roundedsides":
        case "tile":
          this.setContent();
          break;
        case "text":
        case "elevated":
        case "outlined":
        case "textonly":
          this.setContent();
          this.updateButtonColor();
          break;
        case "textcolor":
          this.updateTextColor();
          break;
        case "mode":
          this.setMode();
          this.updateButtonColor();
          break;
        case "color":
          this.updateButtonColor();
          this.updateTextColor();
          break;
        case "opacity":
          this.updateButtonOpacity();
          break;
        default:
          break;
      }
    });
  },

  tick(time) {
    TWEEN.update(time);
  },

  updateButtonColor() {
      if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
          this.finalColor = this.data.color;
      } else if (this.data.mode !== "") {
          this.setMode();
      } else {
          this.finalColor = PRIMARY_COLOR_DARK;
          this.updateTextColor();
      }
      this.buttonMesh.material.color.set(this.finalColor);
      if (this.shadowMesh) this.shadowMesh.material.color.set(this.finalColor);
      if (this.outlineMesh) this.outlineMesh.material.color.set(this.finalColor);   
  },

  updateButtonOpacity() {
      if (this.buttonMesh) {
          this.buttonMesh.material.opacity = this.data.outlined && !this.data.textonly ? this.data.opacity * 0.6 : this.data.opacity;
      }
      if (this.outlineMesh) this.outlineMesh.material.opacity = this.data.opacity;
      if (this.shadowMesh) this.shadowMesh.material.opacity = this.data.opacity * 0.65;
  },

  updateTextColor() {
      // If mode will be used, ignore the textcolor
      if ((this.data.mode === 'light' || this.data.mode === 'dark') 
          && (this.data.color === PRIMARY_COLOR_DARK || this.data.color === "") 
          && !this.data.textonly) return;

      let buttonColorHex;
      // If the button is outlined, calculate the lighter color inside color using opacity
      if (this.data.outlined && !this.data.textonly) {
          const borderColor = new AFRAME.THREE.Color(this.data.color);
          const backgroundColor = new AFRAME.THREE.Color('#808080'); // Assuming gray background
          const opacity = this.buttonMesh ? this.buttonMesh.material.opacity : this.data.opacity * 0.6;
          const blendedColor = borderColor.clone().lerp(backgroundColor, 1 - opacity);
          buttonColorHex = `#${blendedColor.getHexString()}`;
      } else {
          buttonColorHex = `#${this.buttonMesh.material.color.getHexString()}`;
      }

      let textcolor = this.data.textcolor;

      // Calculate contrast
      const contrast = getContrast(textcolor, buttonColorHex);
      
      console.log(`Contrast between ${textcolor} and ${buttonColorHex} is: ${contrast}`);

      // If the contrast is not high enough, adjust the text color
      if (contrast <= 120 && !this.data.textonly) {
          const newTextColor = setContrastColor(buttonColorHex);

          // Only update and alert if the color actually changes
          if (newTextColor !== textcolor) {
              textcolor = newTextColor;
              console.log(`The text color you set does not have enough contrast. It has been set to ${textcolor} for better visibility.`);
          }
      }

      // Update the text element's color
      const textEl = this.el.querySelector("a-troika-text");
      if (textEl) {
          textEl.setAttribute("color", textcolor);
      }
      const iconEl = this.el.querySelector("a-image");
      if (iconEl) {
          iconEl.setAttribute("color", textcolor);
      }
  },

  setSize() {
    switch (this.data.size) {
      case "small":
        this.sizeCoef = 0.06;
        break;

      case "large":
        this.sizeCoef = 0.09;
        break;

      case "extra-large":
        this.sizeCoef = 0.12;
        break;

      case "medium":
      default:
        this.sizeCoef = 0.075;
        break;
    }
  },

  createButton(width, height) {
    const group = new AFRAME.THREE.Group();

    let borderRadius = 0.02;
    let roundedsides = "full";

    if (this.data.rounded) {
        borderRadius = 0.08;
    } else if (this.data.tile) {
        borderRadius = 0;
    }

    if (this.data.roundedsides === "left") {
        roundedsides = "left";
    } else if (this.data.roundedsides === "right") {
        roundedsides = "right";
    }

    this.width = width;

    let opacityValue;
    if (this.data.textonly) {
        opacityValue = 0;
    } else if (this.data.outlined) {
        opacityValue = 0.4; // Outlined opacity
    } else if (this.data.elevated) {
        opacityValue = this.data.opacity; // Has less priority because it was set by default, if user then sets outlined it is clear that outlined is wanted
    } else {
        opacityValue = this.data.opacity; // Default user-defined opacity
    }

    // Create a main button mesh
    const buttonShape = createPartiallyRoundedRectShape(width, height, borderRadius, roundedsides);
    // Using ExtrudeGeometry to properly display border when using outlined prop is true
    const buttonGeometry = new AFRAME.THREE.ExtrudeGeometry(buttonShape, {
      depth: 0.01,
      bevelEnabled: false,
    });
    if (this.data.outlined && !this.data.textonly) buttonGeometry.translate(0, 0, -0.005);

    const buttonMaterial = new AFRAME.THREE.MeshBasicMaterial({
      color: this.data.color, 
      opacity: opacityValue,
      transparent: true,
    });

    const buttonMesh = new AFRAME.THREE.Mesh(buttonGeometry, buttonMaterial);
    this.buttonMesh = buttonMesh;

    group.add(buttonMesh);

    // Create an outline if outlined is true
    if (this.data.outlined && !this.data.textonly) {
      const borderSize = 0.02;
      const outlineShape = createPartiallyRoundedRectShape(
        width + borderSize * 2,
        height + borderSize,
        borderRadius,
        roundedsides
      );
      const outlineGeometry = new AFRAME.THREE.ShapeGeometry(outlineShape);
      const outlineMaterial = new AFRAME.THREE.MeshBasicMaterial({
        color: this.data.color,
        opacity: this.data.opacity,
        transparent: true,
      });
      const outlineMesh = new AFRAME.THREE.Mesh(
        outlineGeometry,
        outlineMaterial
      );
      outlineMesh.position.z = -0.05;

      this.outlineMesh = outlineMesh;
      group.add(outlineMesh);
    }

    // Create a shadow if elevated is true and textonly and outlined are false
    if (this.data.elevated && !this.data.textonly && !this.data.outlined) {
      const shadowGeometry = new AFRAME.THREE.ShapeGeometry(buttonShape);
      const shadowMaterial = new AFRAME.THREE.MeshBasicMaterial({
        color: this.data.color,
        opacity: 0.65 * opacityValue,
        transparent: true,
      });
      const shadowMesh = new AFRAME.THREE.Mesh(shadowGeometry, shadowMaterial);
      const moveButtonCoef = width / 36;
      shadowMesh.position.set(moveButtonCoef, -moveButtonCoef, -0.01);
      this.shadowMesh = shadowMesh;
      group.add(shadowMesh);
    }
    this.el.setObject3D("mesh", group);
  },

  _clearContent() {
      const textEl = this.el.querySelector("a-troika-text");
      if (textEl) textEl.remove();
      const iconEl = this.el.querySelector("a-image");
      if (iconEl) iconEl.remove();
  },

  _appendText(value, sizeCoef) {
      const textEl = document.createElement("a-troika-text");
      textEl.setAttribute("value", value === undefined ? "" : value);
      textEl.setAttribute("align", "center");
      textEl.setAttribute("baseline", "center");
      textEl.setAttribute("anchor", "center");
      textEl.setAttribute("font-size", sizeCoef);
      textEl.setAttribute("position", "0 0 0.02");
      textEl.setAttribute("letter-spacing", "0");
      textEl.setAttribute("fill-opacity", this.data.opacity);
      this.el.appendChild(textEl);
      return textEl;
  },

  _appendIcon(src, size) {
      const iconEl = document.createElement("a-image");
      iconEl.setAttribute("src", src);
      iconEl.setAttribute("height", size);
      iconEl.setAttribute("width", size);
      iconEl.setAttribute("position", "0 0 0.02");
      this.el.appendChild(iconEl);
      return iconEl;
  },

  setContent() {
    this._clearContent();

    const icon = this.data.icon || "";
    const iconpos = this.data.iconpos;
    let text = this.data.text;
    const sizeCoef = this.sizeCoef;

    if (this.data.uppercase) {
      text = text.toUpperCase();
    }

    // Ensure the text does not exceed 15 characters
    if (text.length > 15) {
        text = text.substring(0, 12) + "...";
    }

    const letterWidthRatio = 0.55;
    const textWidth = text.length * letterWidthRatio * sizeCoef;
    const iconWidth = 1.0 * sizeCoef;
    const innerPadding = 0.05;
    const outerPadding = 0.1;

    let width = 0;
    if (icon !== "") {
        width = innerPadding + iconWidth + innerPadding + textWidth + outerPadding;
    } else {
        width = outerPadding + textWidth + outerPadding;
    }

    const height = sizeCoef + 2 * innerPadding;

    this.createButton(width, height);

    const textEl = this._appendText(text, sizeCoef);
    let iconEl = null;

    if (icon !== "") {
        iconEl = this._appendIcon(icon, iconWidth);
        
        let textXPosition;
        let iconXPosition;
        
        if (iconpos === "right") {
            textXPosition = -this.width/2 + outerPadding + textWidth/2;
            iconXPosition = -this.width/2 + outerPadding + textWidth + innerPadding + iconWidth/2;
        } else {
            iconXPosition = -this.width/2 + innerPadding + iconWidth/2;
            textXPosition = -this.width/2 + innerPadding + iconWidth + innerPadding + textWidth/2;
        }
        
        textEl.setAttribute("position", { x: textXPosition, y: 0, z: 0.05 });
        iconEl.setAttribute("position", { x: iconXPosition, y: 0, z: 0.02 });
    }

    this.updateTextColor();

    this.el.setAttribute("class", "clickable");
    this.el.addEventListener("click", () => {
      console.log("button clicked");
      this.animateButtonOnClick();
      this.el.emit("button-clicked", { button: this.el });
    });
  },

  setMode() {
      const shadowMesh = this.shadowMesh;
      // If color is set, or textonly is true, skip applying the mode
      if ((this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") || this.data.textonly) {
          return;
      }

      switch (this.data.mode) {
          case "light":
              this.el.setAttribute("material", { color: VARIANT_LIGHT_COLOR, opacity: 1 });
              this.el.querySelector("a-troika-text").setAttribute("color", "black");
              this.finalColor = VARIANT_LIGHT_COLOR;
              if (shadowMesh) {
                  shadowMesh.material.color.set(VARIANT_LIGHT_COLOR);
                  shadowMesh.material.opacity = 0.65;
                  shadowMesh.material.transparent = true;
              }
              break;
          case "dark":
              this.el.setAttribute("material", { color: VARIANT_DARK_COLOR, opacity: 1 });
              this.el.querySelector("a-troika-text").setAttribute("color", "white");
              this.finalColor = VARIANT_DARK_COLOR;
              if (shadowMesh) {
                  shadowMesh.material.color.set(VARIANT_DARK_COLOR);
                  shadowMesh.material.opacity = 0.65;
                  shadowMesh.material.transparent = true;
              }
              if (this.data.outlined && !this.data.textonly) {
                  this.el.querySelector("a-troika-text").setAttribute("color", VARIANT_DARK_COLOR);
              }
              break;
          default:
              break;
      }
  },

  animateButtonOnClick() {
    const originalColor = this.finalColor;
    const highlightedColor = determineHighlightedColor(this.finalColor);

    const buttonMesh = this.buttonMesh;
    const shadowMesh = this.shadowMesh;

    // Change button mesh color directly
    buttonMesh.material.color.set(highlightedColor);

    if (shadowMesh) {
      shadowMesh.material.color.set(highlightedColor);
    }

    setTimeout(() => {
      buttonMesh.material.color.set(originalColor);

      if (shadowMesh) {
        shadowMesh.material.color.set(originalColor);
      }
    }, 200);
  },
});
