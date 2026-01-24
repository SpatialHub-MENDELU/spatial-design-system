import "../primitives/ar-button.js";
import "../primitives/ar-checkbox.js";
import "../components/position.js";
import "../components/autoXr.js";
import "../components/ar/touch-raycaster.js"

const app = document.getElementById("app");

app.innerHTML = `
<a-scene auto-xr="autoEnter: false;" touch-raycaster>
<a-ar-button
    position="0 1.6 -3"
    size="medium"
    content="Click me"
    billboard
></a-ar-button>
<a-ar-checkbox
    position="0.9 1.6 -3"
    size="medium"   
    content="Check me"
    checked="true"
    billboard
></a-ar-checkbox>
</a-scene>
`;
