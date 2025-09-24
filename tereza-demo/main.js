import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../components/controllers.js";
import "../components/stretchable.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr>
    <a-entity id="rig"
       hands>
    </a-entity>

      <a-box position="0 1.25 -1.5" color="#03FCC6" stretchable></a-box>
    
    </a-scene>`;
