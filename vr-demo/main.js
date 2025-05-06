import "../components/controllerAttach.js";
import "../primitives/ar-button.js";
import "../components/position.js";
import "../components/controllers.js";  
import "../components/autoVr.js";
import "../components/vrInteractive.js";
import "../components/controllerMovement.js";
import "../components/controllerTeleport.js";

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


<!-- Panel attached to right controller -->
<a-entity
    id="rightControllerPanel"
    geometry="primitive: plane; width: 0.25; height: 0.15"
    material="color: #2196F3; opacity: 0.8"
    controller-attach="hand: right; offset: 0.15 0.05 -0.1; faceCamera: true"
    vr-interactive
>
    <a-text value="Controls" align="center" position="0 0.05 0.001" scale="0.1 0.1 0.1" color="white"></a-text>
    
    <!-- Small control buttons -->
    <a-entity position="-0.08 -0.02 0.001" scale="0.5 0.5 0.5">
        <a-entity
            geometry="primitive: circle; radius: 0.05"
            material="color: #FF5722"
            vr-interactive
        ></a-entity>
    </a-entity>
    
    <a-entity position="0 -0.02 0.001" scale="0.5 0.5 0.5">
        <a-entity
            geometry="primitive: circle; radius: 0.05"
            material="color: #4CAF50"
            vr-interactive
        ></a-entity>
    </a-entity>
    
    <a-entity position="0.08 -0.02 0.001" scale="0.5 0.5 0.5">
        <a-entity
            geometry="primitive: circle; radius: 0.05"
            material="color: #9C27B0"
            vr-interactive
        ></a-entity>
    </a-entity>
</a-entity>

<!-- Test scene objects to interact with -->
<a-box position="-1 1 -3" width="0.5" height="0.5" depth="0.5" color="#F44336" vr-interactive></a-box>
<a-sphere position="0 1.25 -3" radius="0.5" color="#2196F3" vr-interactive></a-sphere>
<a-cylinder position="1 1 -3" radius="0.5" height="1" color="#4CAF50" vr-interactive></a-cylinder>

<!-- Camera rig -->
<a-entity id="rig" position="0 0 0">
  <a-camera id="camera" wasd-controls look-controls></a-camera>
  <a-entity controller-movement="mainHand: left; speed: 2"></a-entity>
<a-entity controller-teleport="hand: right; button: trigger"></a-entity>

</a-entity>
`;

app.appendChild(scene);