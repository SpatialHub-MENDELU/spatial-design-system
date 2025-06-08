import "../../components/follow-element.js";
import "../../components/position.js"

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

scene.innerHTML = `
<a-sphere 
  id="sphere1"
  color="#03FCC6" 
  position="0 1.5 -2" 
  radius="0.8"
  follow-camera="angle: 1;"
></a-sphere>

<a-sphere 
  color="#101011" 
  radius="0.3"
  follow-element="
    target: #sphere1;
    place: 0 1 0;
    offset: 0;
  "
></a-sphere>
`

app.appendChild(scene)