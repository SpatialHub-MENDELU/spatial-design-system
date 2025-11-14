import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../primitives/ar-button.js";
import "../components/finger-touch.js";
import "../primitives/ar-button.js";
import "../components/hands-hoverable.js";
import "../primitives/ar-textbox.js";
import "../primitives/ar-checkbox.js";

// Function to create a box at a random position
function createBox() {
  const box = document.createElement("a-box");

  // Generate random position
  const x = (Math.random() - 0.5) * 4; // Random between -2 and 2
  const y = Math.random() * 2 + 1; // Random between 1 and 3
  const z = (Math.random() - 0.5) * 4 - 2; // Random between -4 and 0

  box.setAttribute("position", `${x} ${y} ${z}`);
  box.setAttribute("color", "red");
  box.setAttribute("width", "0.5");
  box.setAttribute("height", "0.5");
  box.setAttribute("depth", "0.5");

  // Add the box to the scene
  const scene = document.querySelector("a-scene");
  scene.appendChild(box);

  console.log(
    `Box added to scene at position: ${x.toFixed(2)}, ${y.toFixed(
      2
    )}, ${z.toFixed(2)}`
  );
}

document.querySelector("#app").innerHTML = `
<a-scene auto-xr="autoEnter: false">
  <a-entity id="rig" hands="autoDisableIfNoHands: false; leftEnabled: true; rightEnabled: true;"></a-entity>

  <!-- or -->

  <a-ar-button
    content="Box Hover"
    finger-touch
    position="-0.5 1.6 -1.5"
    hands-hoverable="hoverColor:#fc00ce;"
  ></a-ar-button>

  <a-ar-button
    content="Box Overlay"
    finger-touch
    position="0.8 1.6 -1.5"
    hands-hoverable="hoverColor:#00ff00;"
  ></a-ar-button>

  <a-box
    position="0 1.2 -1.5"
    width="0.3"
    height="0.3"
    depth="0.3"
    color="#ff6b35"
    hands-hoverable="hoverColor:#ffff00;"
  ></a-box>

  <a-ar-textbox
    position="-0.8 1.0 -1.5"
    value="Hover Textbox"
    hands-hoverable="hoverColor:#ff00ff;"
  ></a-ar-textbox>


</a-scene>`;

// Listen for button clicks and add a box
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("button-clicked", (event) => {
    console.log("Button clicked!", event.detail);
    createBox();
  });
});
