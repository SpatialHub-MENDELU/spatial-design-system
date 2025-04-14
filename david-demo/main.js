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
  
  <!-- Placeable objects -->
<a-ar-menu
    position="0 1.5 -3"
    visible="false"
    primary="#018A6C"
    items="[
            {'color':'white','icon':'/content-save','title':'Save','textColor':'black'},
            {'color':'white','icon':'/close-circle','title':'Quit','textColor':'black'},
            {'color':'white','icon':'/settings','title':'Settings','textColor':'black'},
            {'color':'white','icon':'/file-plus','title':'New file','textColor':'black'}
        ]"
    variant="filled"
    layout="circle"
    place-object="
      heightRange: 0 5;
      surfaceTypes: horizontal, ceiling, wall;
      distanceRange: 0.5 10;
      scale: 0.2;
      isPoster: true;
      faceCamera: false;
    "
></a-ar-menu>
  

      
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
