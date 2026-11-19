// Selection modes of the menu component (issue #141):
// https://github.com/SpatialHub-MENDELU/spatial-design-system/issues/141
//
//   basic    - a clicked item is highlighted only briefly, emits `select`
//   single   - one selected item at a time; `deselect` when it is unselected
//              (by clicking it again or by selecting another item)
//   multiple - any number of selected items; `deselect` when unselecting
//
// The menus can be clicked with the mouse. On load, the page also runs
// automated checks (simulated clicks) and reports OK/FAIL in the overlay.
import "../../primitives/ar-menu.js";

const app = document.getElementById("app");
const report = document.getElementById("report");
const scene = document.createElement("a-scene");

const items = `[
    {'color':'#FF3333','title':'Home','textColor':'white'},
    {'color':'#efbf30','title':'About','textColor':'white'},
    {'color':'#33658A','title':'Profile','textColor':'white'},
    {'color':'#9966CC','title':'Contact','textColor':'white'}
]`;

const ACTIVE = "#00FF00";

scene.innerHTML = `
  <a-entity id="mouseRaycaster"
            raycaster="objects: .clickable"
            cursor="rayOrigin: mouse; fuse: false;"></a-entity>

  <a-entity camera look-controls position="0 1.6 1.2"></a-entity>
  <a-entity laser-controls="hand: right" raycaster="objects: .clickable"></a-entity>
  <a-entity laser-controls="hand: left" raycaster="objects: .clickable"></a-entity>
  

  <a-text value="basic" align="center" color="black" position="-0.9 2.15 -1"></a-text>
  <a-text value="single" align="center" color="black" position="0 2.15 -1"></a-text>
  <a-text value="multiple" align="center" color="black" position="0.9 2.15 -1"></a-text>

  <a-ar-menu id="basic" position="-0.9 1.6 -1" color="#ECECEC" activecolor="${ACTIVE}"
             selectionmode="basic" items="${items}"></a-ar-menu>
  <a-ar-menu id="single" position="0 1.6 -1" color="#ECECEC" activecolor="${ACTIVE}"
             selectionmode="single" items="${items}"></a-ar-menu>
  <a-ar-menu id="multiple" position="0.9 1.6 -1" color="#ECECEC" activecolor="${ACTIVE}"
             selectionmode="multiple" items="${items}"></a-ar-menu>

  <a-sky color="#dde3ea"></a-sky>
`;

app.appendChild(scene);

// Log events of all menus (also for manual testing with the mouse)
const events = [];
["basic", "single", "multiple"].forEach((id) => {
    const menu = document.getElementById(id);
    ["select", "deselect"].forEach((name) => {
        menu.addEventListener(name, (e) => {
            events.push({ menu: id, name, title: e.detail.item.title, selected: e.detail.selectedItems.map(i => i.title) });
            console.log(`[${id}] ${name}`, e.detail.item.title, e.detail.selectedItems.map(i => i.title));
        });
    });
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
const check = (label, condition) => results.push({ label, ok: !!condition });

const isHighlighted = (menuId, index) => {
    const item = document.getElementById(menuId).components.menu.itemEls[index];
    return item.getAttribute("material").color.toUpperCase() === ACTIVE;
};
const highlighted = (menuId) =>
    document.getElementById(menuId).components.menu.itemEls.map((_, i) => isHighlighted(menuId, i));
const click = (menuId, index) => document.getElementById(menuId).components.menu.itemEls[index].emit("click");
const take = () => events.splice(0, events.length);

async function runChecks() {
    // --- basic ---
    take();
    click("basic", 0);
    let ev = take();
    check("basic: click emits one select", ev.length === 1 && ev[0].name === "select");
    check("basic: item highlighted right after click", isHighlighted("basic", 0));
    await wait(500);
    check("basic: highlight is gone after a moment", !highlighted("basic").some(Boolean));
    click("basic", 0);
    ev = take();
    check("basic: second click emits select again (no deselect)", ev.length === 1 && ev[0].name === "select");
    await wait(500);

    // --- single ---
    click("single", 0);
    ev = take();
    check("single: click emits select", ev.length === 1 && ev[0].name === "select");
    check("single: item stays highlighted", (await wait(500), isHighlighted("single", 0)));
    click("single", 1);
    ev = take();
    check("single: selecting another item deselects the previous one first",
        ev.length === 2 && ev[0].name === "deselect" && ev[0].title !== ev[1].title && ev[1].name === "select");
    check("single: only one item highlighted", highlighted("single").filter(Boolean).length === 1 && isHighlighted("single", 1));
    check("single: selectedItems has one item", ev[1].selected.length === 1);
    click("single", 1);
    ev = take();
    check("single: clicking the selected item emits deselect", ev.length === 1 && ev[0].name === "deselect");
    check("single: nothing highlighted", !highlighted("single").some(Boolean));

    // --- multiple ---
    click("multiple", 0);
    click("multiple", 2);
    ev = take();
    check("multiple: two selects", ev.length === 2 && ev.every(e => e.name === "select"));
    check("multiple: both items highlighted", isHighlighted("multiple", 0) && isHighlighted("multiple", 2));
    check("multiple: selectedItems has two items", ev[1].selected.length === 2);
    click("multiple", 0);
    ev = take();
    check("multiple: clicking a selected item emits deselect", ev.length === 1 && ev[0].name === "deselect");
    check("multiple: the other item stays highlighted", !isHighlighted("multiple", 0) && isHighlighted("multiple", 2));

    // --- reset-selection and clickable=false ---
    document.getElementById("multiple").emit("reset-selection");
    check("reset-selection clears highlights", !highlighted("multiple").some(Boolean));
    // Primitive attributes are mapped to the component asynchronously
    document.getElementById("multiple").setAttribute("clickable", false);
    await wait(50);
    click("multiple", 1);
    ev = take();
    check("clickable=false: still emits select, no highlight", ev.length === 1 && ev[0].name === "select" && !isHighlighted("multiple", 1));
    document.getElementById("multiple").setAttribute("clickable", true);

    // --- switching mode at runtime resets the selection ---
    click("single", 3);
    take();
    document.getElementById("single").setAttribute("selectionmode", "multiple");
    await wait(50);
    check("changing selectionmode resets the selection", !highlighted("single").some(Boolean));
    document.getElementById("single").setAttribute("selectionmode", "single");

    const failed = results.filter(r => !r.ok).length;
    report.innerHTML =
        `<b class="${failed ? "fail" : "ok"}">${failed ? `FAIL (${failed}/${results.length})` : `OK (${results.length} checks)`}</b>\n` +
        results.map(r => `<span class="${r.ok ? "ok" : "fail"}">${r.ok ? "✔" : "✘"}</span> ${r.label}`).join("\n") +
        "\n\nClick the items to try the modes (events in the console).";
    window.__menuSelectionResult = { failed, results };
}

scene.addEventListener("loaded", () => setTimeout(runChecks, 500));
