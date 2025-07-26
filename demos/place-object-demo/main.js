import "../../primitives/ar-button.js";
import "../../components/ar/place-object.js";
import "../../components/ar/place-object-manager.js";
import "../../primitives/ar-menu.js";
import 'aframe-extras';

document.querySelector("#app").innerHTML = `
<a-scene     
    id="scene"
    touch-raycaster
    place-object-manager="
        maxObjects: 10;
    "
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
    surfaceTypes: horizontal, wall, ceiling;
    layFlat: true;
    scale: 0.3;
    faceCamera: true;
    heightRange: 0 10;
    "
></a-ar-button>
</a-scene>
`;