import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../components/controllers.js";
import "../components/stretchable.js";
import "../components/vrinteractive.js";
import "../primitives/ar-button.js";
import "../components/finger-touch.js";
import "../primitives/ar-button.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr>
    <a-entity id="rig"
       hands>
    </a-entity>

      <a-box position="0 1.25 -1.5" color="#03FCC6" stretchable></a-box>
    
    </a-scene>`;

//     <a-ar-button
//     stretchable
//     position="0 1.5 -3"
//     content="Button"
//     primary="#018A6C"
//     textcolor="white"
//     size="large"
// ></a-ar-button>
