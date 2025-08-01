import * as AFRAME from "aframe";
import {
  PRIMARY_COLOR_DARK,
  VARIANT_DARK_COLOR,
  VARIANT_LIGHT_COLOR,
} from "../utils/colors.js";

AFRAME.registerComponent("textbox", {
  schema: {
    primary: { type: "string", default: "000000" },
    bordercolor: { type: "string", default: "black" },
    textcolor: { type: "string", default: "black" },
    size: { type: "string", default: "medium" },
    label: { type: "string", default: "" },
    font: {
      type: "string",
      default:
        "https://raw.githubusercontent.com/etiennepinchon/aframe-fonts/master/fonts/robotomono/RobotoMono-Regular.json",
    },
    isactivated: { type: "boolean", default: false },
    variant: { type: "string", default: "" },
    useSystemKeyboard: { type: "boolean", default: false },
  },

  init() {
    // Setting the variant in the keyboard
    this.el.setAttribute(
      "virtualKeyboard",
      "variant",
      this.el.getAttribute("variant")
    );

    this.setSize();
    this.createTextbox();
    this.setText();
    this.setEvents();
    this.createCursor();
  },

  update(oldData) {
    // Dont execute update for the first time, all initial functionality is in init()
    if (!oldData.primary) return;

    // Checking which properties have changed and executing the appropriate functions
    const changedProperties = Object.keys(this.data).filter(
      (property) => this.data[property] !== oldData[property]
    );
    changedProperties.forEach((property) => {
      switch (property) {
        case "label":
          this.setLabel();
          break;
        case "primary":
          this.createTextbox();
          break;
        case "size":
          this.setSize();
          this.createTextbox();
          this.setText();
          this.updateCursorPosition();
          break;
        case "textcolor":
          // this.setText();
          // textcolor does nothing rn, changed color of the text based on variant
          break;
        case "font":
          this.setText();
          break;
        case "bordercolor":
          this.createTextbox();
          break;
        case "isactivated":
          this.switchActivated();
          break;
        case "useSystemKeyboard":
          // The new value will be used the next time the component is activated.
          // No immediate action is required.
          break;
        case "variant":
        //
        default:
          break;
      }
    });
  },

  setSize() {
    let sizeCoef = 1;
    switch (this.data.size) {
      case "small":
        break;
      case "medium":
        sizeCoef = 1.5;
        break;
      case "large":
        sizeCoef = 2;
        break;
      case "extra-large":
        sizeCoef = 2.5;
        break;
      default:
        break;
    }
    this.el.setAttribute("sizeCoef", sizeCoef);
  },

  createMesh(width, height, color, isBorder, opacity = 1) {
    const radius = 0.03 * this.el.getAttribute("sizeCoef");
    const shape = new THREE.Shape();

    shape.moveTo(-width / 2 + radius, -height / 2);
    shape.lineTo(width / 2 - radius, -height / 2);
    shape.quadraticCurveTo(
      width / 2,
      -height / 2,
      width / 2,
      -height / 2 + radius
    );
    shape.lineTo(width / 2, height / 2 - radius);
    shape.quadraticCurveTo(
      width / 2,
      height / 2,
      width / 2 - radius,
      height / 2
    );
    shape.lineTo(-width / 2 + radius, height / 2);
    shape.quadraticCurveTo(
      -width / 2,
      height / 2,
      -width / 2,
      height / 2 - radius
    );
    shape.lineTo(-width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(
      -width / 2,
      -height / 2,
      -width / 2 + radius,
      -height / 2
    );

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      opacity: opacity,
      transparent: opacity < 1,
    });
    const mesh = new THREE.Mesh(geometry, material);

    if (isBorder) {
      mesh.position.z = -0.002;
    }

    return mesh;
  },

  createTextbox() {
    const sizeCoef = this.el.getAttribute("sizeCoef");
    const width = 1 * sizeCoef;
    const height = 0.20625 * sizeCoef;

    this.el.setAttribute("height", height);
    this.el.setAttribute("width", width);

    const inputElement = document.createElement("input");
    this.data.inputElement = inputElement;

    inputElement.type = "text";
    inputElement.id = "a-ar-hidden-input";
    inputElement.style.position = "absolute";
    inputElement.style.opacity = "0";
    inputElement.style.pointerEvents = "none";

    document.body.appendChild(inputElement);

    // const borderColor = this.data.bordercolor
    const borderColor =
      this.el.getAttribute("variant") === "dark"
        ? VARIANT_LIGHT_COLOR
        : VARIANT_DARK_COLOR;

    const textboxMesh = this.createMesh(
      width,
      height,
      this.el.getAttribute("variant") === "dark"
        ? VARIANT_DARK_COLOR
        : VARIANT_LIGHT_COLOR,
      false
    );
    this.el.setObject3D("mesh", textboxMesh);

    const borderWidth = 0.008;
    const borderMesh = this.createMesh(
      width + 2 * borderWidth,
      height + 2 * borderWidth,
      borderColor,
      true
    );
    borderMesh.visible = this.data.isactivated;

    this.el.setObject3D("border", borderMesh);

    // Creating the shadowBox mesh
    const shadowMesh = this.createMesh(
      width,
      height,
      this.el.getAttribute("variant") === "dark"
        ? VARIANT_DARK_COLOR
        : VARIANT_LIGHT_COLOR,
      false,
      0.5
    );
    const moveButtonCoef = width / 55;
    shadowMesh.position.set(moveButtonCoef, -moveButtonCoef, -0.005);

    this.el.setObject3D("shadow", shadowMesh);
  },

  setText() {
    this.el.setAttribute("text", {
      color: this.el.getAttribute("variant") === "dark" ? "white" : "black",
      width: this.el.getAttribute("width") * 1,
      font: this.data.font,
      shader: "msdf",
      xOffset: this.el.getAttribute("width") * 0.075,
      baseline: "center",
      lineHeight: 5,
    });
    const clone = document.createElement("span");

    clone.style.visibility = "visible";
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.whiteSpace = "nowrap";

    // Fontsize has to scale with the component size
    clone.style.font = this.data.font;
    clone.style.fontSize = `${
      this.el.getAttribute("sizeCoef") * (2 / 3) * 16
    }px`;
    clone.textContent = "a";

    document.body.appendChild(clone);

    // Finding the width of a single character, works for monospaced fonts
    this.data.fontWidth = clone.getBoundingClientRect().width * 0.00419;
    document.body.removeChild(clone);
  },

  setLabel() {
    this.el.setAttribute("text", {
      xOffset: 0,
      align: "center",
      value: this.data.label,
      opacity: 0.3,
    });
  },

  switchActivated() {
    const isActivated = this.data.isactivated;
    const hasSystemKeyboard =
      this.detectSystemKeyboard() && this.data.useSystemKeyboard;

    // Switching the visibility of the cursor
    if (isActivated) this.el.startBlinking();
    else this.el.stopBlinking();

    // Switching the visibility of the border
    this.el.getObject3D("border").visible = isActivated;

    // Handle keyboard activation
    if (isActivated) {
      if (hasSystemKeyboard) {
        console.log("System keyboard supported, focusing input");
        this.focusInput();
      } else {
        console.log("Custom keyboard activated");
        this.el.emit("is-textbox-activated", {
          isActivated: true,
          id: this.el.getAttribute("id"),
        });
      }
    } else {
      console.log("Textbox deactivated");
      this.el.emit("is-textbox-activated", {
        isActivated: false,
        id: this.el.getAttribute("id"),
      });
    }
    this.el.toggleListeningToKeydown(isActivated);
  },

  // Check if keyboard is supported in current XR session
  detectSystemKeyboard() {
    const xrSession = this.el.sceneEl.xrSession;
    if (!xrSession) {
      return false;
    }

    console.log({ xrSession });

    if (xrSession) {
      if (xrSession.isSystemKeyboardSupported) {
        console.log("System keyboard supported");
        return true;
      }
    }
    console.log("system keyboard not supported");
    return false;
  },

  focusInput() {
    const inputEl = this.data.inputElement;
    inputEl.style.pointerEvents = "auto";
    inputEl.focus();
  },

  moveTextLine() {
    const textEl = this.el.getAttribute("text");
    const inputEl = this.data.inputElement;
    const textboxWidth = this.el.getAttribute("width");

    if (this.data.moveCursorByAmount + inputEl.value.length < 0) return;
    // If the cursor is at the beginning of the textbox, but there are still some characters left out of the box, move the whole text one char to the left
    // Also check if the last pressed key is left arrow, to prevent moving text when typing
    if (
      this.data.moveCursorByAmount + this.data.numberOfCharactersInTheBox <=
        0 &&
      this.data.numberOfCharactersInTheBox !== inputEl.value.length &&
      this.el.components.virtualKeyboard.data.lastPressedKey === "<"
    ) {
      this.data.moveWholeTextInBoxByAmount -= 1;
    }
    console.log("setting text2", this.el.getAttribute("text").value);

    const textWidthCoef = 0.93; // 7% of the textbox width will be left empty on both sides together
    this.data.textWidthCoef = textWidthCoef;

    const maxAllowedTextWidth = textboxWidth * textWidthCoef; //When reaching this size, the text will start moving to the left
    const maxCharsAmount = Math.floor(
      maxAllowedTextWidth / this.data.fontWidth
    ); // Maximum number of chars that can fit in the textbox
    this.data.maxCharsAmount = maxCharsAmount;
    const textElContentWidth =
      textEl.value.length * (textEl.width / textEl.wrapCount); // The actual width of the text content

    // If the text is longer then the textbox, move it || if the left wall of the textbox is moved, move the text to match the cursor position
    if (
      textElContentWidth > maxAllowedTextWidth ||
      this.data.moveWholeTextInBoxByAmount <= 0
    ) {
      this.el.setAttribute("text", {
        // Cutting the text to the last max characters, that can be displayed in the textbox
        value: inputEl.value.substring(
          inputEl.value.length -
            maxCharsAmount +
            this.data.moveWholeTextInBoxByAmount,
          inputEl.value.length + this.data.moveWholeTextInBoxByAmount
        ),
      });
    }
    console.log("setting text3", this.el.getAttribute("text").value);
  },

  setEvents() {
    let isKeydownActive = false;
    const el = this.el;
    const userEl = document.querySelector("[camera]");
    const inputEl = this.data.inputElement;

    this.setLabel();

    const setText = (lastKeyboardCharacter) => {
      let newValue = inputEl.value;
      const moveCursorByAmount = this.data.moveCursorByAmount;
      // If the cursor is moved, either delete or insert a character at the cursor position
      const cursorIndex = inputEl.value.length + moveCursorByAmount;
      const lastPressedKey =
        this.el.components.virtualKeyboard.data.lastPressedKey || "";

      if (lastPressedKey !== "") {
        // Deleting a character
        if (lastPressedKey === "DEL") {
          if (cursorIndex === 0) return; // Do nothing if the cursor is at the beginning
          newValue =
            inputEl.value.slice(0, cursorIndex - 1) +
            inputEl.value.slice(cursorIndex, inputEl.value.length);
          inputEl.value = newValue;
        } else {
          // Inserting a character
          newValue =
            inputEl.value.substring(0, cursorIndex) +
            lastPressedKey +
            inputEl.value.substring(cursorIndex, inputEl.value.length);
          // Edge case when the cursor is at the beginning of the textbox and the text is longer than the textbox
          if (
            cursorIndex === 0 &&
            inputEl.value.length >= this.data.maxCharsAmount
          )
            this.data.moveWholeTextInBoxByAmount -= 1;
          // this.data.moveWholeTextInBoxByAmount -= 1 - possibly a fix on moving text right
          inputEl.value = newValue;
        }
        this.el.setAttribute("text", { value: newValue });
        this.el.emit("text-changed", { value: newValue });
      }

      const textWidth = this.el.getAttribute("width") * 1;
      this.data.textWidth = textWidth;
      let xOffset = el.getAttribute("text").xOffset;
      if (xOffset === 0) xOffset = textWidth * 2.05;

      const textColor =
        this.el.getAttribute("variant") === "dark" ? "white" : "black";
      this.el.setAttribute("text", {
        align: "left",
        value: newValue,
        opacity: 1,
        width: textWidth * 5,
        xOffset: xOffset,
        font: this.data.font,
        color: textColor,
        wrapCount: 40 * 5,
        baseline: "top",
      });
      console.log("setting text", this.el.getAttribute("text").value);
      this.moveTextLine();
      console.log("setting text4", this.el.getAttribute("text").value);
      this.updateCursorPosition();
    };

    inputEl.addEventListener("input", (e) => {
      const textEl = this.el.getAttribute("text");
      setText(e.target.value);
      this.moveTextLine();
      if (
        textEl.value.length === 0 &&
        this.el.components.virtualKeyboard.data.lastPressedKey === "DEL"
      ) {
        this.setLabel();
        this.updateCursorPosition();
      }
    });

    // This fires when the document visibility changes (including when keyboards appear/disappear)
    const handleVisibilityChange = () => {
      console.log(
        "Visibility changed:",
        document.visibilityState,
        "Textbox activated:",
        this.data.isactivated
      );

      // If document becomes visible again and textbox was activated,
      // it might mean the keyboard was dismissed
      if (document.visibilityState === "visible" && this.data.isactivated) {
        // Add a small delay to avoid immediate dismissal when keyboard first appears
        setTimeout(() => {
          // Check if the input still has focus - if not, keyboard was likely dismissed
          if (document.activeElement !== inputEl && this.data.isactivated) {
            console.log("System keyboard dismissed via visibilitychange event");
            this.data.isactivated = false;
            this.switchActivated();
          }
        }, 100);
      }
    };

    // Store the handler so we can remove it later if needed
    this.data.visibilityChangeHandler = handleVisibilityChange;
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const toggleListeningToKeydown = (activate) => {
      if (activate) {
        document.addEventListener("keydown", this.focusInput());
        if (userEl) userEl.setAttribute("wasd-controls", "enabled", false);
      } else {
        document.removeEventListener("keydown", this.focusInput());
        if (userEl) userEl.setAttribute("wasd-controls", "enabled", true);

        inputEl.style.opacity = 0;
        inputEl.style.pointerEvents = "none";
      }
    };
    this.el.toggleListeningToKeydown = toggleListeningToKeydown;
    const scene = this.el.sceneEl;

    // misto click nothing, click cokooliv co neni komponenta
    scene.addEventListener("click-nothing", (e) => {
      // If the textbox is not activated, or clicking on a object, do nothing
      if (!this.el.object3D.visible || !this.data.isactivated) return;
      this.data.isactivated = false;
      this.switchActivated();
    });

    el.classList.add("clickable");
    el.classList.add("textbox");
    el.addEventListener("click", (event) => {
      // Only focus input if the textbox is clicked directly, not when the keys are clicked
      if (event.target !== this.el) return;

      const allTextboxes = document.getElementsByClassName("textbox");
      // Remove the keyboard from all other textboxes
      Array.from(allTextboxes).forEach((textbox) => {
        if (
          textbox.getAttribute("id") !== this.el.getAttribute("id") &&
          textbox.querySelector("#keyboard") !== null
        ) {
          textbox.components.textbox.data.isactivated = false;
          textbox.getObject3D("border").visible = false;
          textbox.stopBlinking();
          textbox.toggleListeningToKeydown(false);
          textbox.keyboard.parentElement.removeChild(textbox.keyboard);
        }
      });

      // Switching the activation variable
      this.data.isactivated = !this.data.isactivated;
      this.switchActivated();
    });

    this.data.moveCursorByAmount = 0;
    this.data.moveWholeTextInBoxByAmount = 0;
    el.addEventListener("moveCursor", (event) => {
      if (event.detail.direction === "left") {
        this.moveCursorLeft();
      } else if (event.detail.direction === "right") {
        this.moveCursorRight();
      }
    });
  },

  createCursor() {
    let el = this.el;
    let cursorEl = document.createElement("a-entity");

    cursorEl.setAttribute("geometry", {
      primitive: "plane",
      height:
        this.el.getAttribute("height") *
        0.2 *
        this.el.getAttribute("sizeCoef") *
        (2 / 3),
      width: 0.005,
    });
    cursorEl.setAttribute("material", {
      color: this.el.getAttribute("variant") === "dark" ? "white" : "black",
    });

    const cursorInitialPositionX = -this.el.getAttribute("width") / 2.27;
    this.data.cursorInitialPositionX = cursorInitialPositionX;
    cursorEl.setAttribute("position", {
      x: cursorInitialPositionX,
      y: 0,
      z: 0.01,
    });
    cursorEl.setAttribute("visible", false);

    el.appendChild(cursorEl);

    cursorEl.setAttribute("isBlinking", false);
    let blinkInterval;
    let isBlinking = false;

    const startBlinking = () => {
      if (!isBlinking) {
        isBlinking = true;
        cursorEl.object3D.visible = true;
        blinkInterval = setInterval(() => {
          cursorEl.object3D.visible = !cursorEl.object3D.visible;
        }, 250);
      }
    };

    const stopBlinking = () => {
      if (isBlinking) {
        clearInterval(blinkInterval);
        isBlinking = false;
        cursorEl.object3D.visible = false;
      }
    };

    this.cursorEl = cursorEl;
    this.el.startBlinking = startBlinking;
    this.el.stopBlinking = stopBlinking;
  },

  remove() {
    if (this.cursorEl) {
      this.stopBlinking();
      this.el.removeChild(this.cursorEl);
    }

    // Clean up the visibilitychange event listener
    if (this.data.visibilityChangeHandler) {
      document.removeEventListener(
        "visibilitychange",
        this.data.visibilityChangeHandler
      );
    }

    // Clean up the hidden input element
    if (this.data.inputElement && this.data.inputElement.parentElement) {
      this.data.inputElement.parentElement.removeChild(this.data.inputElement);
    }
  },

  moveCursorLeft() {
    this.data.moveCursorByAmount -= 1;
    this.moveTextLine();
    this.updateCursorPosition();
  },
  moveCursorRight() {
    const textEl = this.el.getAttribute("text");
    // Limiting the cursor to never go further right that the last character in the textbox
    if (
      textEl.value.length + this.data.moveCursorByAmount >=
      this.data.numberOfCharactersInTheBox
    )
      return;
    this.data.moveCursorByAmount += 1;
    // If the text has been moved to the left, and now cursor is moving to the right, move the whole textbox
    if (this.data.moveWholeTextInBoxByAmount < 0)
      this.data.moveWholeTextInBoxByAmount += 1;
    this.moveTextLine();
    this.updateCursorPosition();
  },

  updateCursorPosition() {
    const textEl = this.el.getAttribute("text");
    const inputEl = this.data.inputElement;
    let moveCursorByAmount = this.data.moveCursorByAmount;
    const inpuElValue = inputEl.value;
    const fontWidth = this.data.fontWidth;

    const cursorInitialPositionX = this.data.cursorInitialPositionX;
    // If the cursor is at the beginning of the textbox, dont let it cross the left textbox border
    if (inpuElValue.length + moveCursorByAmount < 0) {
      this.data.moveCursorByAmount = inpuElValue.length * -1;
    }
    const numberOfCharactersInTheBox =
      this.el.getAttribute("text").value.length > this.data.maxCharsAmount
        ? this.data.maxCharsAmount
        : this.el.getAttribute("text").value.length;
    this.data.numberOfCharactersInTheBox = numberOfCharactersInTheBox; // Actual number of chars in the textbox

    // switch here
    let cursorX =
      cursorInitialPositionX +
      fontWidth * numberOfCharactersInTheBox +
      fontWidth * (moveCursorByAmount - this.data.moveWholeTextInBoxByAmount);

    // Returning if the cursor is at the end of the textbox
    if (
      cursorX >
      (this.data.textWidthCoef * 1.05 * this.el.getAttribute("sizeCoef")) / 2
    )
      return;
    // Or at the beginning of the textbox
    if (cursorX < cursorInitialPositionX) cursorX = cursorInitialPositionX;
    if (textEl.value === this.data.label) cursorX = cursorInitialPositionX;
    const cursorEl = this.cursorEl;

    cursorEl.setAttribute("geometry", {
      primitive: "plane",
      height:
        this.el.getAttribute("height") *
        0.18 *
        this.el.getAttribute("sizeCoef") *
        (2 / 3),
      width: 0.005 * this.el.getAttribute("sizeCoef") * (2 / 3),
    });

    cursorEl.setAttribute("position", {
      x: cursorX,
      y: 0,
      z: 0.01,
    });
  },
});
