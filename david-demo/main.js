import "../primitives/ar-button.js";
import "../components/ar/place-object.js";
import "../components/ar/place-object-manager.js";
import "../primitives/ar-menu.js";
import 'aframe-extras';
import "../primitives/ar-menu.js";

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
  
<!--   Placeable objects -->
<!--  <a-entity-->
<!--    id="chair-template"-->
<!--    gltf-model="#shrek"-->
<!--    visible="false"-->
<!--    place-object="    -->
<!--      heightRange: 0 5;-->
<!--      surfaceTypes: horizontal, ceiling, wall;-->
<!--      distanceRange: 0.5 10;-->
<!--      scale: 0.2;-->
<!--      isPoster: false;-->
<!--      faceCamera: true;-->
<!--      adjustOrientation: true;-->
<!--    "-->
<!--   ></a-entity>-->
   
   <a-ar-menu
      position="0 1.5 -3"
      primary="#018A6C"
      items="[
                {'color':'white','icon':'/content-save','title':'Save','textColor':'black'},
                {'color':'white','icon':'/close-circle','title':'Quit','textColor':'black'},
                {'color':'white','icon':'/settings','title':'Settings','textColor':'black'},
                {'color':'white','icon':'/file-plus','title':'New file','textColor':'black'}
            ]"
      variant="filled"
      layout="circle"
      visible="false"
      place-object="
          heightRange: 0 5;
          surfaceTypes: horizontal, ceiling, wall;
          distanceRange: 0.5 10;
          scale: 0.2;
          isPoster: true;
          faceCamera: true;
          adjustOrientation: true;
    "
></a-ar-menu>
</a-scene>
`;