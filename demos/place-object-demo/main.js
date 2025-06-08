import "../../primitives/ar-button.js";
import "../../components/ar/place-object.js";
import "../../components/ar/place-object-manager.js";
import "../../primitives/ar-menu.js";
import 'aframe-extras';
import "../../primitives/ar-menu.js";

document.querySelector("#app").innerHTML = `
<a-scene     
    id="scene"
    touch-raycaster
    place-object-manager
    context-menu
    cross-objects
>
<a-ar-button
    visible="false"
    content="Button"
    primary="#018A6C"
    textcolor="white"
    size="small"
    place-object="
    surfaceTypes: horizontal, wall;
    layFlat: false;
    scale: 0.3;
    faceCamera: true;
    "
></a-ar-button>
</a-scene>
`;