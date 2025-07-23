import "aframe";

import "../primitives/ar-textbox.js";
import "../components/autoVr.js";
import "../components/autoXr.js";
import "../components/controllers.js";
import "../components/vrinteractive.js";
import "../components/controllerAttach.js";
import "../components/ar/hands.js";
import "../primitives/ar-button.js";
import "../components/ar/ar-hoverable.js";
import "../components/ar/ar-clickable.js";
import "../components/ar/ar-stretchable.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr="sessionMode: vr; autoEnter: false;
        buttonText: Start VR"
        webxr="optionalFeatures: hand-tracking"
        >

    <a-entity id="rig"
       hands="leftHandColor: #d35400; rightHandColor:rgb(28, 225, 44)">
    </a-entity>

    <a-box stretchable position="0 1.5 -2" color="#03FCC6"></a-box>
</a-scene>`;
