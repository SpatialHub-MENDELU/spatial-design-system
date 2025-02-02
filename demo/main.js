import "../primitives/ar-button.js";
import "../components/position.js";

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

scene.innerHTML = `
<a-ar-button
    position="0 1.6 -3"
    size="medium"
    content="Click me"
    uppercase=true
    rounded=true
    outlined=true
    billboard
></a-ar-button>
`;

app.appendChild(scene);