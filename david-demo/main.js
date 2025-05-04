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
    <a-asset-item id="mike" src="models/mike.glb"></a-asset-item>
<!--    https://sketchfab.com/3d-models/mike-wazowski-sulley-face-swap-46f4f6948e25444880fcdfb4477390da-->
  </a-assets>
  
<!--  <a-entity-->
<!--    id="3dModel"-->
<!--    gltf-model="#mike"-->
<!--    visible="false"-->
<!--    place-object="    -->
<!--      heightRange: 0 5;-->
<!--      surfaceTypes: horizontal, ceiling, wall;-->
<!--      distanceRange: 0.5 10;-->
<!--      scale: 0.0005;-->
<!--      faceCamera: false;-->
<!--      adjustOrientation: false;-->
<!--    "-->
<!--   ></a-entity>-->
<!--   -->
<!--   <a-sphere-->
<!--  color="yellow"-->
<!--  radius="5"-->
<!--  follow-element="-->
<!--    target: #3dModel;-->
<!--    place: 1 0 0;-->
<!--    offset: 0.3;-->
<!--    duration: 300"-->
<!--&gt;</a-sphere>-->
   <a-ar-button
    position="0 1.5 -3"
    content="Button"
    primary="#018A6C"
    textcolor="white"
    size="large"
    place-object="
          heightRange: 0 5;
          surfaceTypes: horizontal, ceiling, wall;
          distanceRange: 0.5 10;
          scale: 0.2;
          faceCamera: true;
          adjustOrientation: true;
          layFlat: true;
    "
></a-ar-button>

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
      
></a-ar-menu>
</a-scene>
`;