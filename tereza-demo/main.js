import "aframe";

import "../primitives/ar-button.js";

document.querySelector("#app").innerHTML = `
<a-scene>

    <a-entity id="rig" hands></a-entity>

    <a-ar-button content="Click Me" hand-clickable position="0 1.5 -2"></a-ar-button>
    </a-scene>`;
