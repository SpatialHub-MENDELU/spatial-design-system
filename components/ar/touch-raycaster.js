import * as AFRAME from "aframe";

// https://github.com/aframevr/aframe/issues/4372#issuecomment-1721412290
AFRAME.registerComponent("touch-raycaster", {
  isDisabled: false,

  events: {
    "toggle-touch-raycaster-disable-state": function () {
      this.isDisabled = !this.isDisabled;
    },
  },

  init() {
    const scene = this.el.sceneEl;
    const camera = this.el.sceneEl.camera;

    document.addEventListener("pointerup", (event) => {
      if (this.isDisabled) return;

      const mouse = new AFRAME.THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // convert to range (-1, 1)
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // convert to range (-1, 1)

      // Set the ray's origin and direction based on the camera and mouse coordinates
      const raycaster = new AFRAME.THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Find intersections between the ray and objects in the scene
      const intersects = raycaster.intersectObjects(scene.object3D.children);

      for (const intersect of intersects) {
        const el = intersect.object.el;
        const isVisible = el?.getAttribute("visible");
        if (!isVisible) continue;

        // The ray reports the innermost mesh, which for a compound control is
        // decoration (an icon, a label). Report the control it belongs to; if
        // nothing in the chain is marked interactive, keep the element itself.
        const target = el.closest(".clickable, .interactive") || el;

        target.emit("click", { el: target });
        break;
      }
    });
  },
});
