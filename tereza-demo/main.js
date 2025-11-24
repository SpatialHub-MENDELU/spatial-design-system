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

    <a-ar-button finger-touch position="-0.8 1.6 -0.7" content="Ahoj"></a-ar-button>
    
    </a-scene>`;
