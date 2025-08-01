import * as AFRAME from "aframe";

AFRAME.registerComponent("hand-clickable", {
  init: function () {
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.classList.add("interactable");
  },
});
