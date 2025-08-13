import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../primitives/ar-button.js";
import "../components/finger-touch.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr="sessionMode: vr; autoEnter: false;
        buttonText: Start VR"
        webxr="optionalFeatures: hand-tracking"
        >

    <a-entity id="rig"
       hands>
    </a-entity>

   <a-ar-button
    finger-touch
    position="0 1.5 -1"
    content="Button"
    primary="#018A6C"
    textcolor="white"
    size="large"
></a-ar-button>
</a-scene>`;
