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

    
     <a-box position="0 1.6 -0.7" width="0.5" height="0.5" depth="0.5" color="#03FCC6" stretchable="dimensionAxes: x, z"></a-box>
     <a-box position="1 1.6 -0.7" width="0.5" height="0.5" depth="0.5" color="#2196F3" stretchable="mode: scale; maxSize: 2; minSize: 0.5"></a-box>
    
    </a-scene>`;
