// Test page for issue #148: the `grid` component used to overwrite the
// geometry of its items with a plane, so e.g. box items became flat.
// https://github.com/SpatialHub-MENDELU/spatial-design-system/issues/148
//
// The new `sizing` property of `grid` decides how items are fitted into their
// cells when the grid entity has its own geometry:
//   geometry (default) - width/height are set, the primitive (and depth) is kept
//   scale              - geometry is kept, the item is scaled uniformly to fit
//   none               - items are only positioned
//
// What to check:
//   1. Row 1 (reproduction from the issue): box items stay boxes (depth 0.3)
//      in all three modes. The panel on the right verifies this automatically.
//   2. Row 2: a-ar-button items. `scale` keeps the button proportions and
//      text, `geometry` stretches only the button background.
//   3. Row 3: a-ar-menu with layout=grid still renders a 2x2 grid of cells
//      (regression check, its items have no geometry and become planes).
//   4. Click any item: it is reported in the panel (raycasting works).
import "../../primitives/ar-menu.js"; // also registers `grid` via components/menu.js
import "../../primitives/ar-button.js";

const app = document.getElementById("app");
const report = document.getElementById("report");
const scene = document.createElement("a-scene");

const MODES = ["geometry", "scale", "none"];
const COLORS = ["#8A8A8A", "#018A6C", "#00C170", "#03FCC6"];
const COLUMN_X = [-1.6, 0, 1.6];

const boxItems = (mode) => COLORS.map((color, i) => `
    <a-text value="${mode} ${i + 1}" align="center" color="black" class="clickable"
            geometry="primitive: box; width: 0.4; height: 0.2; depth: 0.3"
            material="color: ${color}"></a-text>`).join("");

const buttonItems = () => ["One", "Two", "Three", "Four"].map((label) => `
    <a-ar-button content="${label}" size="small" color="#03FCC6" textcolor="black"
                 class="clickable"></a-ar-button>`).join("");

const menuItems = `[
    {'color':'#FF3333','title':'Home','textColor':'white'},
    {'color':'#efbf30','title':'About','textColor':'white'},
    {'color':'#33658A','title':'Profile','textColor':'white'},
    {'color':'#9966CC','title':'Contact','textColor':'white'}
]`;

scene.innerHTML = `
  <a-entity id="mouseRaycaster" raycaster="objects: .clickable"
            cursor="rayOrigin: mouse; fuse: false;"></a-entity>
  <a-entity camera look-controls wasd-controls="acceleration: 50" position="0 1.7 3.2"></a-entity>
  <a-entity laser-controls="hand: right" raycaster="objects: .clickable"></a-entity>

  ${MODES.map((mode, i) => `
    <a-text value="Row 1: box items, sizing: ${mode}" align="center" color="black"
            position="${COLUMN_X[i]} 3.05 -1" scale="0.5 0.5 0.5"></a-text>
    <a-box id="boxes-${mode}" width="1.4" height="0.8" depth="0.05"
           position="${COLUMN_X[i]} 2.55 -1" color="#ECECEC"
           grid="columns: 2; sizing: ${mode}">
      ${boxItems(mode)}
    </a-box>

    <a-text value="Row 2: a-ar-button, sizing: ${mode}" align="center" color="black"
            position="${COLUMN_X[i]} 1.95 -1" scale="0.5 0.5 0.5"></a-text>
    <a-plane id="buttons-${mode}" width="1.4" height="0.6"
             position="${COLUMN_X[i]} 1.55 -1" color="#ECECEC"
             grid="columns: 2; sizing: ${mode}">
      ${buttonItems()}
    </a-plane>
  `).join("")}

  <a-text value="Row 3: a-ar-menu layout=grid (regression)" align="center" color="black"
          position="0 1.05 -1" scale="0.5 0.5 0.5"></a-text>
  <a-ar-menu id="menu" position="0 0.6 -1" color="#ECECEC" layout="grid"
             items="${menuItems}"></a-ar-menu>

  <a-sky color="#B7D9CB"></a-sky>
`;

app.appendChild(scene);

// --- Click reporting -------------------------------------------------------
let lastClick = "–";
scene.addEventListener("click", (e) => {
    // Walk up to the grid cell (a direct child of an entity with `grid`).
    let target = e.target;
    while (target && !(target.parentElement && target.parentElement.components && target.parentElement.components.grid)) {
        target = target.parentElement;
    }
    if (!target) return;
    const container = target.parentElement.id || "?";
    lastClick = `${container} › ${target.getAttribute("value") || target.getAttribute("content") || target.tagName.toLowerCase()}`;
    render();
});

// --- Automatic checks ------------------------------------------------------
const fmt = (n) => (Math.round(n * 1000) / 1000).toString();

function describe(item) {
    const g = item.getAttribute("geometry") || {};
    const s = item.object3D.scale;
    return {
        primitive: g.primitive || "–",
        size: `${fmt(g.width ?? 0)} × ${fmt(g.height ?? 0)}${g.depth !== undefined ? ` × ${fmt(g.depth)}` : ""}`,
        scale: `${fmt(s.x)} ${fmt(s.y)} ${fmt(s.z)}`,
        g,
        s,
    };
}

function checkBoxItem(mode, d) {
    if (d.primitive !== "box") return "primitive changed";
    if (d.g.depth !== 0.3) return "depth changed";
    if (Math.abs(d.s.z - 1) > 1e-6) return "z scale changed";
    if (mode === "geometry" && Math.abs(d.s.x - 1) > 1e-6) return "scale not reset";
    if (mode === "geometry" && Math.abs(d.g.width - 0.4) < 1e-6) return "not resized";
    if (mode === "scale" && Math.abs(d.g.width - 0.4) > 1e-6) return "geometry changed";
    if (mode === "scale" && Math.abs(d.s.x - 1) < 1e-6) return "not scaled";
    if (mode === "none" && (Math.abs(d.g.width - 0.4) > 1e-6 || Math.abs(d.s.x - 1) > 1e-6)) return "item resized";
    return "";
}

let detailsOpen = false;
report.addEventListener("toggle", (e) => { detailsOpen = e.target.open; }, true);

function render() {
    let html = `<div>Last click: <b>${lastClick}</b></div><details ${detailsOpen ? "open" : ""}><summary>Details</summary>`;
    let failures = 0;

    for (const mode of MODES) {
        html += `<h3>Row 1 · sizing: ${mode}</h3><table><tr><th>item</th><th>primitive</th><th>w × h × d</th><th>scale</th><th></th></tr>`;
        for (const item of document.querySelectorAll(`#boxes-${mode} > a-text`)) {
            const d = describe(item);
            const error = checkBoxItem(mode, d);
            if (error) failures++;
            html += `<tr><td>${item.getAttribute("value")}</td><td>${d.primitive}</td><td>${d.size}</td><td>${d.scale}</td>
                     <td class="${error ? "fail" : "ok"}">${error || "OK"}</td></tr>`;
        }
        html += `</table>`;
    }

    for (const mode of MODES) {
        html += `<h3>Row 2 · sizing: ${mode}</h3><table><tr><th>item</th><th>primitive</th><th>w × h</th><th>scale</th></tr>`;
        for (const item of document.querySelectorAll(`#buttons-${mode} > a-ar-button`)) {
            const d = describe(item);
            html += `<tr><td>${item.getAttribute("content")}</td><td>${d.primitive}</td><td>${d.size}</td><td>${d.scale}</td></tr>`;
        }
        html += `</table>`;
    }

    const menuCells = document.querySelectorAll("#menu > .menu-item");
    const menuOk = menuCells.length === 4 &&
        Array.from(menuCells).every((c) => (c.getAttribute("geometry") || {}).primitive === "plane");
    if (!menuOk) failures++;
    html += `<h3>Row 3 · a-ar-menu</h3><div class="${menuOk ? "ok" : "fail"}">${menuCells.length} cells, all planes: ${menuOk ? "OK" : "FAIL"}</div>`;

    html += `</details>`;
    html = `<div class="${failures ? "fail" : "ok"}" id="summary"><b>${failures ? `${failures} check(s) failed` : "All checks passed"}</b></div>` + html;
    report.innerHTML = html;
}

scene.addEventListener("loaded", () => setTimeout(render, 1500));
setInterval(render, 2000);
