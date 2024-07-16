import * as AFRAME from "aframe";
import { VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import { createRoundedSquareShape, createRoundedRectShape} from "../utils/utils.js"

AFRAME.registerComponent('virtualKeyboard', {
  schema: {
    position: {type: 'vec3', default: {x: 0.2, y: -0.83, z: 0}},
    isCaps: { type: 'boolean', default: false },
    isShift: { type: 'boolean', default: false },
    variant: { type: 'string', default: '' },
  },

  init() {
    this.data.inputElement = this.el.components.textbox.data.inputElement // Input element from the textbox
    this.setFirstLayout();
    this.keyboardVisibility();
    this.changeVariant();
  },

  update(oldData) {
    // Dont execute update for the first time, all initial functionality is in init()
    if(!oldData.isCaps) return

    // Checking which properties have changed and executing the appropriate functions
    const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property])
    changedProperties.forEach(property => {
      switch(property){
        case 'variant':
          //
          break
        case 'isCaps':
          //
          break
        case 'isShift':
          //
          break
        default:
          break;
      }
    })
  },

  changeVariant() {
    this.el.setAttribute('textbox', 'variant', this.el.getAttribute("variant"));	
  },

  setFirstLayout() {
    this.clearKeyboard();
    const keysLayoutFirst = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['CPS', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['^', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'DEL'],
      ['123', 'SPACE']
    ];
    
    this.createKeyboardLayout(keysLayoutFirst);
  },

  setSecondLayout() {
    this.clearKeyboard();
    const keysLayoutSecond = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
      ['.', ',', '?', '!', '\'', '#', '+', '%', 'DEL'],
      ['ABC', 'SPACE']
    ];
    this.createKeyboardLayout(keysLayoutSecond);
  },

  clearKeyboard() {
    const existingKeys = this.el.querySelectorAll('.a-ar-key');
    existingKeys.forEach(key => key.parentNode.removeChild(key));
  },

  createKeyboardLayout(layout) {
    const keyboard = document.createElement('a-entity');
    keyboard.setAttribute('id', 'keyboard');
    keyboard.setAttribute('billboard', {value: true})
    keyboard.setAttribute('auto-scale', {value: true})
    // keyboard.setAttribute('fit-into-fov', {percentage: 40})

    // Creating the function for keys creation
    const createKey = (key, xPos, yPos, size) => {
      let keyShape;
      const keySize = 0.1 * size;
      const borderRadius = 0.04;
      const keyEl = document.createElement('a-entity');

      if (key === 'SPACE') {
        xPos += 0.68;
        keyShape = createRoundedRectShape(1.56 * size, 2 * keySize, borderRadius);
      } else {
        keyShape = createRoundedSquareShape(keySize, borderRadius)
      }

      // Creating the key mesh
        const keyGeometry = new AFRAME.THREE.ShapeGeometry(keyShape);
        const keyMaterial = new AFRAME.THREE.MeshBasicMaterial({
          color: this.el.getAttribute("variant") === 'dark' ? VARIANT_DARK_COLOR : 'white'
        })
        const keyMesh = new AFRAME.THREE.Mesh(keyGeometry, keyMaterial)

      // Creating the shadowBox mesh
      const shadowGeometry = new AFRAME.THREE.ShapeGeometry(keyShape);
      const shadowMaterial = new AFRAME.THREE.MeshBasicMaterial({
        color: this.el.getAttribute("variant") === 'dark' ? VARIANT_DARK_COLOR : VARIANT_LIGHT_COLOR,
        opacity: 0.5,
        transparent: true
      })
      const shadowMesh = new AFRAME.THREE.Mesh(shadowGeometry, shadowMaterial)
      const moveButtonCoef = keySize / 7;
      shadowMesh.position.set(moveButtonCoef, -moveButtonCoef, -0.005);

        keyEl.setAttribute('class', 'a-ar-key');
        keyEl.setAttribute('position', `${this.data.position.x + xPos} ${this.data.position.y + yPos} ${this.data.position.z}`);
        keyEl.setAttribute('visible', false);

        keyEl.setObject3D('key', keyMesh)
        keyEl.setObject3D('shadow', shadowMesh)
        keyboard.appendChild(keyEl);

        keyEl.setAttribute('material', `opacity: 0; transparent: true`);

        // Custom animation for the keys
        keyEl.setAttribute('animation__opacity', {
            property: 'material.opacity',
            startEvents: 'animate-opacity-in', // Custom events to trigger animations
            stopEvents: 'animate-opacity-out',
            to: 1,
            dur: 250,
            easing: 'easeInOutQuad'
        });

        const textEl = document.createElement('a-text');
        const textElValue = key === 'SPACE' ? ' ' : key === 'DEL' ? 'DEL' : key;
        textEl.setAttribute('value', textElValue);
        textEl.setAttribute('align', 'center');
        textEl.setAttribute('position', '0 0 0.0001');
        textEl.setAttribute('width', 2 * size);
        textEl.setAttribute('color', this.el.getAttribute("variant") === 'dark' ? 'white' : 'black');
        textEl.setAttribute('visible', false)
        textEl.classList.add('a-ar-key-text');
        keyEl.appendChild(textEl);

        keyEl.classList.add('clickable');
        this.attachKeyListeners(keyEl, key, textElValue);
    }

    let yPos = 0.4;
    layout.forEach((row, rowIndex) => {
    let xPos = -1.2 + (rowIndex > 1 ? (rowIndex - 1) * 0.11 : 0);

    // 0.22 for each box with a key
    const rowWidth = row.length * 0.22;

    // Create invisible row background to not emit 'click-nothing' when missing the letter slightly
    const rowBackground = document.createElement('a-plane');
    rowBackground.setAttribute('class', 'a-ar-key-row-background');
    rowBackground.setAttribute('position', `${this.data.position.x + xPos + rowWidth / 2 - 0.11} ${this.data.position.y + yPos} ${this.data.position.z - 0.01}`);
    rowBackground.setAttribute('width', rowWidth);
    rowBackground.setAttribute('height', 0.24); 
    rowBackground.setAttribute('material', 'opacity: 0; transparent: true;');
    keyboard.appendChild(rowBackground);

    row.forEach((key) => {
      createKey(key, xPos, yPos, 1);
      xPos += 0.225;
    });

    yPos -= 0.225;
  });

    // Creating the arrows for moving the cursor
    let arrowsXpos = -0.29
    let arrowsYpos = 0.59
    for (let arrow of ['<', '>']) {
      createKey(arrow, arrowsXpos, arrowsYpos, 0.7)
      arrowsXpos += 0.16
    }

    // Creating the keys of the keyboard
    this.el.appendChild(keyboard);
    this.data.keyboard = keyboard;
    this.el.keyboard = keyboard;

    // If the keyboard has been capsed or shifted before clicking on a diferent one, change the keys to uppercase
    if(this.data.isCaps || this.data.isShift) this.changeKeysLowerUpperCase(true);
  },

  attachKeyListeners(keyElement, keyValue, textElementValue) {
    // Creating input event to be later emitted to trigger input event in the textbox
    const inputEvent = new Event('input', {
      bubbles: true, 
      cancelable: true,
    });
    this.data.inputEvent = inputEvent;

    keyElement.addEventListener('click', () => {
      if(this.data.keyboard.getAttribute('visible') === false) return;
      this.data.lastPressedKey = keyValue;
      this.el.emit('key-pressed', { value: keyValue })
      switch (keyValue) {
        case '<':
          this.el.emit('moveCursor', { direction: 'left' });
          break;
        case '>':
          this.el.emit('moveCursor', { direction: 'right' });
          break;
        case 'DEL':
          this.deleteLastCharacter();
          break;
        case 'CPS':
          this.toggleCapsLock();
          break;
        case '^':
          this.toggleShift();
          break;
        case '123':
          this.setSecondLayout();
          break;
        case 'ABC':
          this.setFirstLayout();
          break;
        default:
          this.addClickedCharacter(textElementValue);
          break;
      }
    });
  },

  deleteLastCharacter(){
    const textInput = this.el
    const currentText = textInput.getAttribute('text').value;
    
    if(currentText === textInput.getAttribute('label')) return;
    // Calling the input event to trigger functionality in textbox
    this.data.lastPressedKey = 'DEL';
    textInput.components.textbox.data.inputElement.dispatchEvent(this.data.inputEvent);
  },

  changeKeysLowerUpperCase(toUpperCase) {
    this.el.querySelectorAll('.a-ar-key').forEach((keyEl) => {
      const textEl = keyEl.querySelector('a-text');
      const key = textEl.getAttribute('value');
      // Only change letters, not special keys like 'DEL'
      if (key.length === 1) {
        textEl.setAttribute('value', toUpperCase ? key.toUpperCase() : key.toLowerCase());
      }
    });
  },

  toggleShift() {
    this.data.isShift = !this.data.isShift;
    this.changeKeysLowerUpperCase(this.data.isShift)
  },

  toggleCapsLock() {
    this.data.isCaps = !this.data.isCaps;
    this.changeKeysLowerUpperCase(this.data.isCaps)
  },

  addClickedCharacter(textElValue) {
    const newChar =  this.data.isCaps || this.data.isShift ? textElValue.toUpperCase() : textElValue;

    // Calling the input event to trigger functionality in textbox
    this.data.lastPressedKey = newChar;
    this.el.components.textbox.data.inputElement.dispatchEvent(this.data.inputEvent);

    // Reseting all the keys to lowercase after shift case
    if(this.data.isShift){
      this.changeKeysLowerUpperCase(false);
      this.data.isShift = false;
    }
  },

  // Animating the keyboard visibility
  animateKeyVisibility(visible) {
    const keys = Array.from(this.data.keyboard.querySelectorAll('.a-ar-key'))
    const texts = this.el.querySelectorAll('.a-ar-key-text');

    texts.forEach(text => {
      text.setAttribute('visible', visible)
      text.object3D.visible = true;
      visible ? text.classList.add('clickable') : text.classList.remove('clickable');
    })
    keys.forEach(key => {
      // Trigger animation based on visibility.
      if (visible) {
        key.emit('animate-opacity-in');
    } else {
        key.emit('animate-opacity-out');
    }
    key.setAttribute('visible', visible);
      key.object3D.visible = true;
      visible ? key.classList.add('clickable') : key.classList.remove('clickable');
    });

    this.el.querySelectorAll('.a-ar-key-row-background').forEach(rowBackground => {
      rowBackground.object3D.visible = true;
      visible ? rowBackground.classList.add('clickable') : rowBackground.classList.remove('clickable');
    });

    },

  keyboardVisibility() {
    // Remove all keyboards in the first run
    Array.from(document.querySelectorAll('#keyboard')).forEach(keyboard => {
      if(keyboard.parentElement !== this.el && keyboard.parentElement !== null) 
      console.log('keyboard children', keyboard.children)
      keyboard.parentElement.removeChild(keyboard);
    })
    // const keys = Array.from(this.data.keyboard.children)
    // console.log('keys: ', keys);
    // keys.forEach(key => {
    //   key.setAttribute('visible', false);
    //   key.object3D.visible = false;
    // })
    // Listening to the event from the textbox to animate the keyboard visibility
    this.el.addEventListener('is-textbox-activated', (event) => { 
      const keyboard = this.data.keyboard;  
      if (event.detail.isActivated) {
        this.setFirstLayout();
        setTimeout(() => {
          this.animateKeyVisibility(true);
        }, 100)
      } else {
        // When keyboard is deactivated, check if keyboard exists before removing
        if (keyboard && keyboard.parentElement) {
          this.animateKeyVisibility(false);
          setTimeout(() => {keyboard.parentElement.removeChild(keyboard);
            this.data.keyboard = null;
          }, 150)
        }
      }
    });
  },
});