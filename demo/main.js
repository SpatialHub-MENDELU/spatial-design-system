import "../primitives/ar-button.js";
import "../primitives/ar-progressbar.js"
import "../components/position.js";

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

scene.innerHTML = `
<a-ar-progressbar
    position="0 1.6 -3"
    value="60"
    textvisibility="true"
></a-ar-progressbar>
`;

app.appendChild(scene);