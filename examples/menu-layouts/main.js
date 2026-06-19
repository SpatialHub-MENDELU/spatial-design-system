// Reproduction of docs issue #107: grid and circle layouts are broken.
// https://github.com/SpatialHub-MENDELU/spatial-design-system-docs/issues/107
//
// This demo reproduces the problem from two angles:
//
//   1. The `a-ar-menu` primitive with `layout="grid"` / `layout="circle"`
//      (as shown in ar-vr-primitives/menu.md).
//   2. The standalone `grid` / `circle` components with NESTED CHILDREN
//      (the exact examples from the ar-vr-components/grid.md and
//      ar-vr-components/circle.md docs pages).
//
// Expected:
//   - grid: a grid of individually positioned/sized cells.
//   - circle: a radial (pie) layout of segments.
//
// Observed (the bug being reproduced):
//   - grid: renders as a single monolithic light-green/blue square,
//     the individual cells are not laid out.
//   - circle: nothing visible at all.
import "../../primitives/ar-menu.js"; // also registers `grid` and `circle` via components/menu.js

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

const items = `[
    {'color':'#FF3333','title':'Home','textColor':'white'},
    {'color':'#efbf30','title':'About','textColor':'white'},
    {'color':'#33658A','title':'Profile','textColor':'white'},
    {'color':'#9966CC','title':'Contact','textColor':'white'}
]`;

scene.innerHTML = `
  <a-entity id="mouseRaycaster"
            raycaster="objects: .clickable"
            cursor="rayOrigin: mouse; fuse: false;"></a-entity>

  <a-entity camera look-controls
            wasd-controls="acceleration: 50"
            position="0 1.6 2.2"></a-entity>

  <!-- ===================================================================
       Row 1 — a-ar-menu primitive (items prop), from menu.md
       =================================================================== -->
  <a-text value="menu  layout=grid" align="center" color="black"
          position="-1.2 2.7 -1"></a-text>
  <a-text value="menu  layout=circle" align="center" color="black"
          position="1.2 2.7 -1"></a-text>

  <!-- Grid layout: should be a 2x2 grid of coloured cells.
       Bug: appears as one monolithic square. -->
  <a-ar-menu
      position="-1.2 1.9 -1"
      color="#ECECEC"
      layout="grid"
      items="${items}"
  ></a-ar-menu>

  <!-- Circle layout: should be a radial menu.
       Bug: nothing is visible. -->
  <a-ar-menu
      position="1.2 1.9 -1"
      color="#ECECEC"
      layout="circle"
      items="${items}"
  ></a-ar-menu>

  <!-- ===================================================================
       Row 2 — standalone components with nested children, copied verbatim
       from the docs pages ar-vr-components/grid.md and circle.md
       =================================================================== -->
  <a-text value="grid component" align="center" color="black"
          position="-1.2 1.1 -1" scale="0.7 0.7 0.7"></a-text>
  <a-text value="circle component" align="center" color="black"
          position="1.2 1.1 -1" scale="0.7 0.7 0.7"></a-text>

  <!-- Exact example from ar-vr-components/grid.md -->
  <a-entity grid position="-1.2 0.3 -1" scale="0.5 0.5 0.5">
    <a-plane color="#8A8A8A"></a-plane>
    <a-plane color="#018A6C"></a-plane>
    <a-plane color="#00C170"></a-plane>
    <a-plane color="#03FCC6"></a-plane>
  </a-entity>

  <!-- Exact example from ar-vr-components/circle.md -->
  <a-entity circle position="1.2 0.3 -1" scale="0.5 0.5 0.5">
    <a-entity material="color: #8A8A8A"></a-entity>
    <a-entity material="color: #018A6C"></a-entity>
    <a-entity material="color: #00C170"></a-entity>
    <a-entity material="color: #03FCC6"></a-entity>
  </a-entity>

  <a-sky color="#B7D9CB"></a-sky>
`;

app.appendChild(scene);
