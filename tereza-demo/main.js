import "aframe";

import "../components/autoXr.js";
import "../components/ar/hands.js";
import "../primitives/ar-button.js";
import "../components/finger-touch.js";
import "../primitives/ar-button.js";
import "../components/hands-hoverable.js";
import "../primitives/ar-textbox.js";

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
    content="Click Me"
    finger-touch
    position="0 1.6 -1"
    hands-hoverable="hoverEffect: color; hoverColor:#fc00ce;"
  ></a-ar-button>

</a-scene>`;

// Listen for button clicks and add a box
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("button-clicked", (event) => {
    console.log("Button clicked!", event.detail);
    createBox();
  });
});

{
  /* <a-ar-textbox
    position="0 1.6 -3"
    label="Label"
    size="extra-large"
    finger-touch
></a-ar-textbox> */
}

const box = document.querySelector("a-box");
box.addEventListener("click", () => {
  console.log("box clicked");
  const previousColor = box.getAttribute("material").color;

  box.setAttribute("material", "color", "red");

  setTimeout(() => {
    box.setAttribute("material", "color", previousColor);
  }, 100);
});
