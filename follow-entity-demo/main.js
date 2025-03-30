import "../components/follow-entity.js";
import "../components/position.js"

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

scene.innerHTML = `
<a-sphere 
  id="spehere1"
  color="#03FCC6" 
  position="0 1.5 -2" 
  radius="0.8"
  follow-camera="angle: 1;"
></a-sphere>

<a-sphere 
  color="#101011" 
  position="0 10 -2" 
  radius="0.8"
  follow-entity="
    target: #spehere1;
  "
></a-sphere>
`

app.appendChild(scene)