import * as AFRAME from "aframe";

AFRAME.registerComponent("stretchable", {
  schema: {
    minScale: { default: 0.5 },
    maxScale: { default: 2 },
    scaleSpeed: { default: 0.1 },
  },
  init() {
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.classList.add("interactable");

    this.el.addEventListener("obbcollisionstarted", () => {
      console.log("Collision started");
    });
    this.el.addEventListener("obbcollisionended", () => {
      console.log("Collision ended");
    });

    this.el.addEventListener("pinchstarted", () => {
      console.log("Pinch started");
    });
    this.el.addEventListener("pinchended", () => {
      console.log("Pinch ended");
    });
  },
});
