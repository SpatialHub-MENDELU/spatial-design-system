import * as AFRAME from "aframe";

AFRAME.registerComponent("finger-touch", {
  init: function () {
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.classList.add("clickable");

    this.el.addEventListener("obbcollisionstarted", this.onHoverStart);
    this.el.addEventListener("obbcollisionended", this.onHoverEnd);
  },

  onHoverStart(event) {
    console.log("coll started", { event });
    const isPointing = event.detail.withEl.getAttribute("pointing");
    if (isPointing === "true") {
      event.target.emit("click");
    }
  },

  onHoverEnd(event) {
    console.log("coll ended");
    const isPointing = event.detail.withEl.getAttribute("pointing");
    // if (isPointing === "true") {
    //   event.target.emit("click");
    // }
  },
});
