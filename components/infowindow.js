import * as AFRAME from 'aframe';
import { createRoundedRectShape } from '../utils/utils.js';
import { PRIMARY_COLOR_DARK } from "../utils/colors.js"
import * as TWEEN from '@tweenjs/tween.js';

AFRAME.registerComponent('infowindow', {
  schema: {
    isVisible: {type: 'boolean', default: false},
    content: {type: 'string', default: 'Info text here'},
    startposition: {type: 'vec3', default: {x: 0, y: 5, z: -1}},
    targetposition: {type: 'vec3', default: {x: 0, y: 0, z: 0}},
    duration: {type: 'number', default: 500},
    primary: {type: 'string', default: PRIMARY_COLOR_DARK},
    textcolor: {type: 'string', default: 'white'},
    width: {type: 'number', default: 2},
    height: {type: 'number', default: 0.8},
  },
  init() {
    const infowindowShape = createRoundedRectShape(this.data.width, this.data.height, 0.066);
    const infowindowGeometry = new AFRAME.THREE.ShapeGeometry(infowindowShape);
    const infowindowMaterial = new AFRAME.THREE.MeshBasicMaterial({ color: this.data.primary });
    const infowindowMesh = new AFRAME.THREE.Mesh(infowindowGeometry, infowindowMaterial);
    this.el.setObject3D('mesh', infowindowMesh);

    this.text = document.createElement('a-text');
    this.text.setAttribute('color', this.data.textcolor);
    this.text.setAttribute('position', '0 0 0.1');
    this.text.setAttribute('align', 'center');
    this.el.appendChild(this.text);

    this.el.setAttribute('position', this.data.startposition);

    this.updateContent();

    this.el.object3D.position.set(this.data.startposition.x, this.data.startposition.y, this.data.startposition.z); // Start above the scene

    this.el.setAttribute('class', 'clickable');
    this.el.addEventListener('click', () => {
      this.updateVisibility();
    });

    this.el.setAttribute('visible', this.data.isVisible);
    this.updateVisibility();
  },
  update(oldData) {
    if (oldData.isVisible !== this.data.isVisible) {
      this.updateVisibility();
    }
    if (oldData.content !== this.data.content) {
      this.updateContent();
    }
    if (oldData.primary !== this.data.primary) {
      this.el.getObject3D('mesh').material.color.set(this.data.primary);
    }
  },
  updateContent() {
    this.text.setAttribute('value', this.data.content);
  },
  updateVisibility() {
    if (this.data.isVisible) {
      this.show();
    } else {
      this.hide();
    }
  },
  show() {
    new TWEEN.Tween(this.el.object3D.position)
      .to(this.data.targetposition, this.data.duration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onStart(() => {
        this.el.setAttribute('visible', true);
        this.data.isVisible = true;
      })
      .start();
  },
  hide() {
    new TWEEN.Tween(this.el.object3D.position)
      .to(this.data.startposition, this.data.duration)
      .easing(TWEEN.Easing.Quadratic.In)
      .onComplete(() => {
        this.el.setAttribute('visible', false);
        this.data.isVisible = false;
      })
      .start();
  }
});
