import "aframe";

import "../components/autoXr.js";

import "../components/ar/hands.js";
import "../components/controllers.js";

import "../primitives/ar-textbox.js";
import "../primitives/ar-button.js";

import "../components/finger-touch.js";
import "../components/stretchable.js";
import "../components/hands-hoverable.js";

document.querySelector("#app").innerHTML = `
<a-scene auto-xr="autoEnter: false; sessionMode: auto">

   <!-- Use this rig to implement manipulating components -->
    <a-entity id="rig" hands></a-entity>


   <a-box position="0 1.6 -0.7" width="0.5" height="0.5" depth="0.1" color="blue" grabbable stretchable hands-hoverable>
   <a-ar-button size="small" finger-touch position="0 0 0.065" content="Ahoj"></a-ar-button>
   </a-box>
  
  <a-box position="0.7 1.6 -0.7" width="0.5" height="0.5" depth="0.1" color="red" grabbable stretchable hands-hoverable></a-box>
  </a-box>
  
  
  </a-scene>`;
// There remains issue with nested objects probably. When I hover over the object its fine. When I change size of the whole box, the hover efect doesnt go away.

const box = document.querySelector("#green-plane");
box.addEventListener("click", () => {
  box.setAttribute("color", "red");
});

box.addEventListener("click-ended", () => {
  box.setAttribute("color", "green");
});
