import * as AFRAME from "aframe";

AFRAME.registerComponent("finger-touch", {
  init: function () {
    this.el.setAttribute("obb-collider", "centerModel: true");
    this.el.classList.add("clickable");

    this.el.addEventListener("hand-hover-started", this.onHoverStart);
    this.el.addEventListener("hand-hover-ended", this.onHoverEnd);
  },

  onHoverStart(event) {
    const isPointing = event.detail?.hand?.getAttribute("pointing");
    if (isPointing === "true") {
      event.target.emit("click");
    }
  },

  onHoverEnd(event) {
    const isPointing = event.detail?.hand?.getAttribute("pointing");
    if (isPointing === "true") {
      event.target.emit("click-ended");
    }
  },

  remove() {
    this.el.removeEventListener("hand-hover-started", this.onHoverStart);
    this.el.removeEventListener("hand-hover-ended", this.onHoverEnd);
  },
});
