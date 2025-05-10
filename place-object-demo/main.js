import "../primitives/ar-button.js";
import "../components/ar/place-object.js";
import "../components/ar/place-object-manager.js";
import "../primitives/ar-menu.js";
import 'aframe-extras';
import "../primitives/ar-menu.js";

document.querySelector("#app").innerHTML = `
<a-scene     
    id="scene"
    touch-raycaster
    place-object-manager
    context-menu
    cross-objects
>

  <!-- Asset definitions -->
<!--  <a-assets>-->
<!--    <a-asset-item id="shrek" src="models/shrek_dancing.glb"></a-asset-item>-->
<!--    <a-asset-item id="mike" src="models/mike.glb"></a-asset-item>-->
<!--&lt;!&ndash;    https://sketchfab.com/3d-models/mike-wazowski-sulley-face-swap-46f4f6948e25444880fcdfb4477390da&ndash;&gt;-->
<!--  </a-assets>-->
<!--  -->
<!--  <a-entity-->
<!--    gltf-model="#mike"-->
<!--    visible="false"-->
<!--    place-object="    -->
<!--      surfaceTypes: horizontal, wall;-->
<!--      scale: 0.0005;-->
<!--      adjustOrientation: false;-->
<!--      customRotation: 0 0 90;-->
<!--    "-->
<!--   ></a-entity>-->

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