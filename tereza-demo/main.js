import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../primitives/ar-button.js";
import "../components/finger-touch.js";
import "../primitives/ar-button.js";
import "../components/controllers.js";
import "../components/stretchable.js";
import "../components/hands-hoverable.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr="autoEnter: false;">
    <a-entity id="rig"
       hands>
    </a-entity>

     <a-box position="0 1.6 -0.7" width="0.5" height="0.5" depth="0.1" color="#03FCC6" stretchable="dimensionAxes: x, y" hands-hoverable>
        <a-ar-button vr-interactive size="small" finger-touch position="0 0 0" content="Ahoj"></a-ar-button>
    </a-box>
    </a-scene>`;
