import "./primitives/ar-button.js";
import "./components/position.js";
import "./components/flexboxDepricated.js"
import "./components/flexbox/flexbox.js"

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

scene.innerHTML = `
<a-plane 
  position="0 1.6 -5" 
  width="4"
  height="5"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;
      gap: 1 1;
      justify: around;
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue" scale="1 1 2" flex-grow></a-plane>
  <a-plane color="green" scale="1 1 2" ></a-plane>
 
</a-plane>
`;

app.appendChild(scene);