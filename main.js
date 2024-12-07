import "./primitives/ar-button.js";
import "./components/position.js";
import "./components/flexbox_old.js"
import "./components/flexbox/flexbox.js"

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

scene.innerHTML = `
<a-plane 
  position="0 1.6 -5" 
  width="2"
  height="2"
  material="color: #018A6C"
  flexbox_old="
      direction: row;
      mainAlign: center;
      secondaryAlign: center;
      gap: 50 50;
      wrap: true;
  "
>
  <a-plane color="white"></a-plane>
  <a-plane color="white"></a-plane>
  <a-plane color="white"></a-plane>
  <a-plane color="white"></a-plane>
</a-plane>

<a-plane 
  position="6 1.6 -5" 
  width="8"
  height="2"
  material="color: #018A6C"
  flexbox="
      direction: row;
  "
>
  <a-plane color="white" width="1.5"></a-plane>
  <a-plane color="pink" scale="2 2 2"></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="yellow"></a-plane>
</a-plane>
`;

app.appendChild(scene);