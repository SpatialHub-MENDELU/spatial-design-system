import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../primitives/ar-button.js";
import "../components/finger-touch.js";
import "../primitives/ar-button.js";
import "../primitives/ar-textbox.js";
import "../components/autoXr.js";
import "../components/controllers.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr>

  <a-entity id="rig" controllers>
    </a-entity>

    <a-ar-textbox label="Name" placeholder="Enter your name" position="0 1.5 -2" useSystemKeyboard></a-ar-textbox>
    </a-scene>`;
