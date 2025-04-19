import "../primitives/ar-button.js";
import "../components/ar/place-object.js";
import "../components/ar/place-object-manager.js";
import "../primitives/ar-menu.js";
import 'aframe-extras';

document.querySelector("#app").innerHTML = `
<a-scene     
    id="scene"
    xr-mode-ui="XRMode: ar;"
    webxr="optionalFeatures: hit-test;"
    ar-hit-test="mapSize: 0 0"
    touch-raycaster
    place-object-manager="
        showPreview: true;
        maxObjects: 10;
    "
    context-menu
    cross-objects
>

  <!-- Asset definitions -->
  <a-assets>
    <a-asset-item id="shrek" src="models/shrek_dancing.glb"></a-asset-item>
  </a-assets>
  
  <!-- Placeable objects -->
  <a-entity
    id="chair-template"
    gltf-model="#shrek"
    visible="false"
    place-object="
      heightRange: 0 5;
      surfaceTypes: horizontal, ceiling, wall;
      distanceRange: 0.5 10;
      scale: 0.2;
      isPoster: false;
      faceCamera: true;
    "
   ></a-entity>
</a-scene>
`;