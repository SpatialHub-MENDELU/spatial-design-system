import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../primitives/ar-button.js";
import "../components/finger-touch.js";
import "../primitives/ar-button.js";
import "../components/hands-hoverable.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr="autoEnter: false">
  <a-entity id="rig" hands="autoDisableIfNoHands: false; leftEnabled: true; rightEnabled: true;"></a-entity>
  <a-box
    position="0 1.5 -2"
    hands-hoverable="hoverEffect: color; hoverColor:#fc00ce;"
    finger-touch
  ></a-box>
  <!-- or -->
  <a-ar-button
    content="Click Me"
    finger-touch
    hands-hoverable="hoverEffect: border; hoverColor:#fc00ce;"
    position="1 2 -2"
  ></a-ar-button>
</a-scene>`;

const box = document.querySelector("a-box");
box.addEventListener("click", () => {
  console.log("box clicked");
  const previousColor = box.getAttribute("material").color;

  box.setAttribute("material", "color", "red");

  setTimeout(() => {
    box.setAttribute("material", "color", previousColor);
  }, 100);
});
