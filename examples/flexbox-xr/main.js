// Test page: flexbox layout updates during an immersive WebXR session.
// Follow-up of issue #148:
// https://github.com/SpatialHub-MENDELU/spatial-design-system/issues/148
//
// flexbox used to schedule its layout with window.requestAnimationFrame. During
// an immersive session browsers may never call it, which left the flexbox's
// "pending update" flag set forever, so every later layout update was dropped.
// Now the layout runs in the component's tick(), which A-Frame drives from the
// renderer's animation loop on desktop and in XR.
//
// How to test
//   Desktop: tick "Simulate XR". This drops window.requestAnimationFrame
//     callbacks scheduled by the flexbox code. With the old code the layout
//     freezes (new items pile up in the centre, status turns red); with the fix
//     nothing changes.
//   Headset (e.g. Quest Browser, run `npm run dev -- --host`): enter VR/AR and
//     watch the items being added/removed every 2 s, or use the 3D Add/Remove
//     buttons with the controller. The 3D status text must keep showing "OK".
import "../../components/flexbox/flexbox.js";
import "../../primitives/ar-button.js";

// --- XR simulation: drop rAF callbacks requested by the flexbox code -------
const nativeRaf = window.requestAnimationFrame.bind(window);
let simulateXr = false;
window.requestAnimationFrame = (callback) => {
    if (simulateXr && /components\/flexbox\//.test(new Error().stack || "")) {
        return 0; // never called, like window rAF during an immersive session
    }
    return nativeRaf(callback);
};

// --- Count layout passes ----------------------------------------------------
const layoutPasses = new Map();
const flexboxProto = AFRAME.components.flexbox.Component.prototype;
const originalSetItemsLayout = flexboxProto.setItemsLayout;
flexboxProto.setItemsLayout = function (...args) {
    layoutPasses.set(this.el.id, (layoutPasses.get(this.el.id) || 0) + 1);
    return originalSetItemsLayout.apply(this, args);
};

// --- Scene ------------------------------------------------------------------
const app = document.getElementById("app");
const scene = document.createElement("a-scene");
scene.setAttribute("webxr", "optionalFeatures: local-floor");

const COLORS = ["#018A6C", "#00C170", "#03FCC6", "#8A8A8A", "#33658A", "#9966CC"];

scene.innerHTML = `
  <a-entity id="mouseRaycaster" raycaster="objects: .clickable"
            cursor="rayOrigin: mouse; fuse: false;"></a-entity>
  <a-entity camera look-controls wasd-controls position="0 1.6 1.5"></a-entity>
  <a-entity laser-controls="hand: right" raycaster="objects: .clickable"></a-entity>
  <a-entity laser-controls="hand: left" raycaster="objects: .clickable"></a-entity>

  <!-- Parent flexbox: items are added/removed here -->
  <a-plane id="outer" width="2.4" height="0.6" color="#ECECEC" position="0 1.9 -1.5"
           flexbox="justify: center; items: center; gap: 0.05 0"></a-plane>

  <!-- Nested flexbox: re-laid out after the parent (used to rely on rAF too) -->
  <a-plane id="parent-of-nested" width="2.4" height="0.5" color="#DDDDDD" position="0 1.25 -1.5"
           flexbox="justify: center; items: center; gap: 0.05 0">
    <a-plane id="nested" width="1.2" height="0.4" color="#BBBBBB"
             flexbox="justify: between; items: center">
      <a-box width="0.2" height="0.2" depth="0.05" color="#FF3333"></a-box>
      <a-box width="0.2" height="0.2" depth="0.05" color="#efbf30"></a-box>
      <a-box width="0.2" height="0.2" depth="0.05" color="#33658A"></a-box>
    </a-plane>
  </a-plane>

  <a-ar-button id="btn-add" position="-0.35 0.75 -1.5" content="Add" size="small"
               color="#018A6C" textcolor="white" class="clickable"></a-ar-button>
  <a-ar-button id="btn-remove" position="0.35 0.75 -1.5" content="Remove" size="small"
               color="#8A8A8A" textcolor="white" class="clickable"></a-ar-button>

  <a-text id="status3d" value="" align="center" color="black" width="2"
          position="0 0.45 -1.5"></a-text>

  <a-sky color="#B7D9CB"></a-sky>
`;
app.appendChild(scene);

const outer = scene.querySelector("#outer");
let counter = 0;

function addItem() {
    if (outer.children.length >= 8) return;
    const item = document.createElement("a-box");
    item.setAttribute("width", "0.2");
    item.setAttribute("height", "0.3");
    item.setAttribute("depth", "0.05");
    item.setAttribute("color", COLORS[counter++ % COLORS.length]);
    outer.appendChild(item);
}

function removeItem() {
    if (outer.lastElementChild) outer.lastElementChild.remove();
}

// --- Layout check -----------------------------------------------------------
// After a layout pass, items of a centred row must be ordered left to right
// without overlapping. Items that were never laid out sit at x = 0.
function layoutIsValid() {
    const items = Array.from(outer.children);
    for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1].object3D.position.x;
        const cur = items[i].object3D.position.x;
        if (cur - prev < 0.2 - 1e-3) return false;
    }
    return true;
}

let lastChange = performance.now();
let ok = true;

function renderStatus() {
    // Give the layout a moment after a change before judging it.
    const settled = performance.now() - lastChange > 300;
    if (settled) ok = layoutIsValid();
    const xr = scene.is("vr-mode") ? (scene.is("ar-mode") ? "AR" : "VR") : "no";
    const text = [
        `Immersive session: ${xr}`,
        `Items in outer flexbox: ${outer.children.length}`,
        `Layout passes: outer ${layoutPasses.get("outer") || 0}, nested ${layoutPasses.get("nested") || 0}`,
        `Layout: ${ok ? "OK" : "NOT UPDATED"}`,
    ];
    document.getElementById("status").innerHTML =
        text.slice(0, 3).join("<br>") + `<br><b class="${ok ? "ok" : "fail"}">${text[3]}</b>`;
    scene.querySelector("#status3d").setAttribute("value", text.slice(1).join("\n"));
    scene.querySelector("#status3d").setAttribute("color", ok ? "#065f46" : "#b91c1c");
}

const observer = new MutationObserver(() => { lastChange = performance.now(); });
observer.observe(outer, { childList: true });

// --- Controls ---------------------------------------------------------------
document.getElementById("add").addEventListener("click", addItem);
document.getElementById("remove").addEventListener("click", removeItem);
document.getElementById("simulate").addEventListener("change", (e) => { simulateXr = e.target.checked; });

scene.addEventListener("loaded", () => {
    scene.querySelector("#btn-add").addEventListener("click", addItem);
    scene.querySelector("#btn-remove").addEventListener("click", removeItem);
    addItem();
    addItem();
});

// Auto mode: grow to 6 items, then shrink to 1, repeat. Useful in a headset.
let growing = true;
setInterval(() => {
    if (!document.getElementById("auto").checked) return;
    if (growing) { addItem(); if (outer.children.length >= 6) growing = false; }
    else { removeItem(); if (outer.children.length <= 1) growing = true; }
}, 2000);

setInterval(renderStatus, 250);
