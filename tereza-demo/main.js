import "aframe";

import "../primitives/ar-button.js";
import "../primitives/ar-textbox.js";
import "../components/autoXr.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr>

    <a-camera>
    <a-cursor></a-cursor>
    </a-camera>

    <a-ar-textbox label="Name" placeholder="Enter your name" position="0 1.5 -2"></a-ar-textbox>
    </a-scene>`;
