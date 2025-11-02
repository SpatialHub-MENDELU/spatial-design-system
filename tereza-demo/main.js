import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../primitives/ar-button.js";
import "../components/finger-touch.js";
import "../primitives/ar-button.js";
import "../components/controllers.js";
import "../components/stretchable.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr="autoEnter: false;">
    <a-entity id="rig"
       hands>
    </a-entity>

    <a-box position="0 1 -1.5" width="0.5" height="0.5" depth="0.5" color="#03FCC6" stretchable></a-box>
    <a-box position="0 2 -1.5" width="0.5" height="0.5" depth="0.5" color="#03FCC6" stretchable></a-box>

</a-scene>`;

{
  /* <a-ar-button
finger-touch
position="0 1.5 -1"
content="Button"
primary="#018A6C"
textcolor="white"
size="large"
></a-ar-button> */
}
