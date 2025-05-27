import "../components/controllerAttach.js";
import "../primitives/ar-button.js";
import "../components/position.js";
import "../components/controllers.js";
import "../components/autoVr.js";
import "../components/vrInteractive.js";
import "../components/controllerMovement.js";
import "../components/controllerTeleport.js";
import "../primitives/ar-checkbox.js";
import "../primitives/ar-switch.js"

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

scene.setAttribute("vr-mode-ui", "enabled: true");
scene.setAttribute("loading-screen", "enabled: true");
scene.setAttribute("xr", "requestReferenceSpace: local");

scene.setAttribute("auto-vr", {
  autoEnter: true,
});
scene.setAttribute("controllers", {
  leftColor: "#FF0000",
});

scene.innerHTML = `
<!-- Simple environment for better orientation -->
<a-sky color="#ECECEC"></a-sky>
<a-plane position="0 0 0" rotation="-90 0 0" width="20" height="20" color="#7BC8A4" class="interactive"></a-plane>
<a-box position="14 0 -1" width="1.5" height="0.2" depth="1.5" color="#4CC3D9" class="interactive"></a-box>
<a-box position="19 0 -0" width="1.5" height="0.2" depth="1.5" color="#4CC3D9" class="interactive"></a-box>
<a-box position="24 0 1" width="1.5" height="0.2" depth="1.5" color="#4CC3D9" class="interactive"></a-box>
<a-box position="29 0 -2" width="1.5" height="0.2" depth="1.5" color="#4CC3D9" class="interactive"></a-box>

<a-entity
    id="goldenCoin"
    position="29 2.8 -2"
    geometry="primitive: cylinder; radius: 0.15; height: 0.02"
    material="color: #FFD700; metalness: 0.9; roughness: 0.1; emissive: #AAA000; emissiveIntensity: 0.3"
    rotation="90 0 0"
    vr-interactive
    animation="property: rotation; to: 90 360 0; dur: 3000; easing: linear; loop: true"
>
    <!-- Add a glow effect -->
    <a-entity
        geometry="primitive: sphere; radius: 0.18"
        material="color: #FFFFFF; opacity: 0.2; transparent: true"
        animation="property: material.opacity; to: 0.4; dir: alternate; dur: 1000; easing: easeInOutSine; loop: true"
    ></a-entity>
</a-entity>


<!-- Maze Ceiling -->
<a-plane position="-14 4 0" rotation="90 0 0" width="12" height="12" color="#555555" material="side: double"></a-plane>
<a-plane position="-14 0 0" rotation="90 0 0" width="12" height="12" color="#7BC8A4" material="side: double" class="interactive"></a-plane>

<!-- Outer Walls -->
<!-- North wall -->
<a-box position="-14 2 -6" width="12" height="4" depth="0.2" color="#444444" class="interactive"></a-box>
<!-- South wall -->
<a-box position="-14 2 6" width="12" height="4" depth="0.2" color="#444444" class="interactive"></a-box>
<!-- East wall with entrance -->
<a-box position="-8 2 -4" width="0.2" height="4" depth="4" color="#444444" class="interactive"></a-box>
<a-box position="-8 2 4" width="0.2" height="4" depth="4" color="#444444" class="interactive"></a-box>
<!-- West wall -->
<a-box position="-20 2 0" width="0.2" height="4" depth="12" color="#444444" class="interactive"></a-box>

<!-- Maze Interior Walls -->
<!-- Vertical walls -->
<a-box position="-11 2 -1.5" width="0.2" height="4" depth="5" color="#444444" class="interactive"></a-box>
<a-box position="-17 2 3" width="0.2" height="4" depth="6" color="#444444" class="interactive"></a-box>
<a-box position="-14 2 -2" width="0.2" height="4" depth="4" color="#444444" class="interactive"></a-box>
<a-box position="-14 2 4" width="0.2" height="4" depth="3" color="#444444" class="interactive"></a-box>

<a-entity
    id="goldenCoin"
    position="-15 0.8 -2"
    geometry="primitive: cylinder; radius: 0.15; height: 0.02"
    material="color: #FFD700; metalness: 0.9; roughness: 0.1; emissive: #AAA000; emissiveIntensity: 0.3"
    rotation="90 0 0"
    vr-interactive
    animation="property: rotation; to: 90 360 0; dur: 3000; easing: linear; loop: true"
>
    <!-- Add a glow effect -->
    <a-entity
        geometry="primitive: sphere; radius: 0.18"
        material="color: #FFFFFF; opacity: 0.2; transparent: true"
        animation="property: material.opacity; to: 0.4; dir: alternate; dur: 1000; easing: easeInOutSine; loop: true"
    ></a-entity>
</a-entity>


<!-- Horizontal walls -->
<a-box position="-14 2 -4" width="8" height="4" depth="0.2" color="#444444" class="interactive"></a-box>
<a-box position="-16 2 0" width="8" height="4" depth="0.2" color="#444444" class="interactive"></a-box>
<a-box position="-12 2 2" width="8" height="4" depth="0.2" color="#444444" class="interactive"></a-box>


<!-- Add ambient light so the scene isn't black -->
<a-entity light="type: ambient; color: #BBB; intensity: 0.5"></a-entity>
<a-entity light="type: directional; color: #FFF; intensity: 0.6" position="-0.5 1 1"></a-entity>

<!-- Flashlight attached to left controller - initially invisible -->
<a-entity
    id="flashlight"
    controller-attach="hand: left; offset: 0 0.03 -0.08; rotation: 0 0 0;"
    visible="false"
>
    <!-- Flashlight body -->
    <a-entity
        geometry="primitive: cylinder; radius: 0.02; height: 0.12"
        material="color: #222222"
        position="0 0 0"
        rotation="90 0 0"
    ></a-entity>
    <!-- Flashlight lens -->
    <a-entity
        geometry="primitive: cylinder; radius: 0.025; height: 0.02"
        material="color: #FFFF99; emissive: #FFFF99; emissiveIntensity: 0.8"
        position="0 0 -0.07"
        rotation="90 0 0"
    ></a-entity>
    <!-- Light beam -->
    <a-entity
        light="type: spot; color: #FFFFCC; intensity: 1.0; angle: 20; penumbra: 0.3; decay: 0.5; distance: 10"
        position="0 0 -0.08"
        rotation="0 0 0"
    ></a-entity>
</a-entity>

<!-- Panel attached to right controller -->
<a-entity
    id="rightControllerPanel"
    geometry="primitive: plane; width: 0.25; height: 0.15"
    material="color: #2196F3; opacity: 0.8"
    controller-attach="hand: right; offset: 0.15 0.05 -0.1; faceCamera: true"
    class="interactive"
>
    <a-text value="Controls" align="center" position="0 0.05 0.001" scale="0.1 0.1 0.1" color="white"></a-text>
    
    <!-- Small control buttons with labels -->
    <a-entity position="-0.08 -0.02 0.001" scale="0.2 0.2 0.2">
            <!-- Teleporting label -->
            <a-text value="Teleporting" align="center" position="0 0.2 0" scale="0.35 0.35 0.35" color="white"></a-text>
            <a-ar-checkbox
                id="teleportCheckbox"
                vr-interactive
                size="small"
                value="true"
            ></a-ar-checkbox>
    </a-entity>
    
    <a-entity position="0 -0.02 0.001" scale="0.2 0.2 0.2">
            <!-- Flashlight label -->
            <a-text value="Flashlight" align="center" position="0 0.2 0" scale="0.35 0.35 0.35" color="white"></a-text>
            <a-ar-checkbox
                id="flashlightCheckbox"
                vr-interactive
                size="small"
            ></a-ar-checkbox>
    </a-entity>
    
    <a-entity position="0.08 -0.02 0.001" scale="0.2 0.2 0.2">
            <!-- Movement mode label -->
            <a-text value="Movement" align="center" position="0 0.2 0" scale="0.35 0.35 0.35" color="white"></a-text>
        <a-ar-switch
            id="movementSwitch"
            size="small"
            vr-interactive
        ></a-ar-switch>
    </a-entity>
</a-entity>

<!-- Test scene objects to interact with -->
<a-box position="-1 1 -3" width="0.5" height="0.5" depth="0.5" color="#F44336" vr-interactive></a-box>
<a-sphere position="0 1.25 -3" radius="0.5" color="#2196F3" vr-interactive></a-sphere>

<a-entity
    id="welcomeBoard"
    position="0 1.6 -2"
    geometry="primitive: plane; width: 3; height: 1.5"
    material="color: #FFFFFF; opacity: 0.95"
    class="interactive"
>
    <a-text 
        value="Welcome to SDS VR Demo\n\nHere you can test out all the VR components"
        align="center"
        position="0 0 0.01"
        color="#333333"
        width="3.5"
        wrap-count="30"
    ></a-text>
    
    <!-- Border decoration -->
    <a-entity
        geometry="primitive: plane; width: 3.1; height: 1.6"
        material="color: #2196F3; opacity: 0.9"
        position="0 0 -0.01"
    ></a-entity>
</a-entity>

<!-- Camera rig -->
<a-entity id="rig" position="0 0 0">
  <a-camera id="camera"></a-camera>
  <a-entity id="movementController" controller-movement="mainHand: left; speed: 2; mode: controller"></a-entity>
  <a-entity id="teleportController" controller-teleport="hand: right; button: trigger"></a-entity>
</a-entity>
`;

app.appendChild(scene);

document.addEventListener('DOMContentLoaded', () => {
  const sceneEl = document.querySelector('a-scene');
  
  sceneEl.addEventListener('loaded', () => {
    const teleportCheckbox = document.getElementById('teleportCheckbox');
    const flashlightCheckbox = document.getElementById('flashlightCheckbox');
    const movementSwitch = document.getElementById('movementSwitch');
    const flashlight = document.getElementById('flashlight');
    const teleportController = document.getElementById('teleportController');
    const movementController = document.getElementById('movementController');
    const goldenCoin = document.getElementById('goldenCoin');

    flashlightCheckbox.addEventListener('value-changed', (event) => {
      flashlight.setAttribute('visible', event.detail.value);
    });
    
    teleportCheckbox.addEventListener('value-changed', (event) => {
      if (event.detail.value) {
        teleportController.setAttribute('controller-teleport', {
          interactionClass: 'interactive',
        });
      } else {
        teleportController.setAttribute('controller-teleport', {
            interactionClass: 'disabled',
          });
      }
    });
    
    movementSwitch.addEventListener('value-changed', (event) => {
      const currentAttributes = movementController.getAttribute('controller-movement');
      currentAttributes.mode = event.detail.value ? 'head' : 'controller';
      movementController.setAttribute('controller-movement', currentAttributes);
    });


    goldenCoin.addEventListener('click', () => {
        goldenCoin.setAttribute('animation__spin', {
          property: 'rotation',
          to: '90 720 0',
          dur: 1000,
          easing: 'easeInOutQuad'
        });
        
        goldenCoin.setAttribute('animation__scale', {
          property: 'scale',
          to: '0 0 0',
          dur: 1000,
          easing: 'easeInQuad',
          begin: 500
        });
        
        goldenCoin.setAttribute('animation__fade', {
          property: 'material.opacity',
          to: '0',
          dur: 1000,
          easing: 'easeInQuad',
          begin: 500
        });
        
        setTimeout(() => {
          goldenCoin.remove();
        }, 1500);
      });
    
  });
});