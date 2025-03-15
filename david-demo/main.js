import "../primitives/ar-button.js";
import "../components/ar/place-object.js";
import "../components/ar/place-object-manager.js";
import 'aframe-extras';

document.querySelector("#app").innerHTML = `
<a-scene     
    id="scene"
    xr-mode-ui="XRMode: ar;"
    webxr="optionalFeatures: hit-test;"
    ar-hit-test="mapSize: 0 0"
    touch-raycaster
    place-object-manager
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
    animation-mixer="clip: *;"
    place-object="
      heightRange: 0 5;
      surfaceTypes: horizontal;
      distanceRange: 0.5 3.0;
      scale: 0.2"
  ></a-entity>
  
  <!-- UI controls -->
  <a-entity id="controls" position="0 0 -1">
    <!--  Clear ALL btn-->
    <a-ar-button
        billboard
        position="0 1 0"
        id="menu__toggle-button"
        primary="green"
        scale="0.2 0.2 0.2"
        size="medium"
        content="Clear All"
        uppercase="true"
        rounded="true"
        outlined="true"
        textcolor="white"
        variant=""
        onclick="document.querySelector('[place-object-manager]').components['place-object-manager'].removeAllObjects()"
      ></a-ar-button>
  </a-entity>
</a-scene>
`;
