import "../primitives/ar-button.js";
import "../components/position.js";
import "../components/flexboxDeprecated.js"
import "../components/flexbox/flexbox.js"
import "../components/infowindow.js"

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

const zIndex = '-22'
const justifyRowX = '-20.1'
const justifyColX = '-16'

const alignRowX = '-10'
const alignColX = '-5.9'

scene.innerHTML = `
<!-- JUSTIFY -->
<a-text 
    value="justify" 
    position="-18 18.5 ${zIndex}" 
    color="black"
    align="center"
    scale="4 4 4"
></a-text>

<!-- Justify-row-->
<a-text
    value="row" 
    position="${justifyRowX} 15.5 ${zIndex}" 
    color="black"
    align="center"
    scale="3 3 3"
></a-text>

<!-- justify-start -->
<a-text 
    value="justify-start" 
    position="${justifyRowX} 13.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyRowX} 11 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;
      justify: start
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- justify-end -->
<a-text 
    value="justify-end" 
    position="${justifyRowX} 8.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyRowX} 6 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;

      justify: end
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
    <a-plane color="green"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- justify-center -->
<a-text 
    value="justify-center" 
    position="${justifyRowX} 3.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyRowX} 1 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;
      justify: center
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- justify-between -->
<a-text 
    value="justify-between" 
    position="${justifyRowX} -1.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyRowX} -4 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;
      justify: between
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- justify-around -->
<a-text 
    value="justify-around" 
    position="${justifyRowX} -6.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyRowX} -9 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;
      justify: around;
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- Justify-col-->
<a-text
    value="col" 
    position="${justifyColX} 15.5 ${zIndex}" 
    color="black"
    align="center"
    scale="3 3 3"
></a-text>

<!-- justify-start -->
<a-text 
    value="justify-start" 
    position="${justifyColX} 13.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyColX} 11 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: col;
      wrap: true;
      justify: start
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink"></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- justify-end -->
<a-text 
    value="justify-end" 
    position="${justifyColX} 8.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyColX} 6 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: col;
      wrap: true;
      justify: end
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink"></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- justify-center -->
<a-text 
    value="justify-center" 
    position="${justifyColX} 3.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyColX} 1 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: col;
      wrap: true;
      justify: center
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink"></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- justify-between -->
<a-text 
    value="justify-between" 
    position="${justifyColX} -1.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyColX} -4 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: col;
      wrap: true;
      justify: between
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink"></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green" height="1.5"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- justify-around -->
<a-text 
    value="justify-around" 
    position="${justifyColX} -6.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${justifyColX} -9 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: col;
      wrap: true;
      justify: around;
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink"></a-plane>
  <a-plane color="blue"></a-plane>
  <a-plane color="green" height="1.5"></a-plane>
  <a-plane color="red"></a-plane>
</a-plane>

<!-- ALIGN -->
<a-text 
    value="align" 
    position="-8 18.5 ${zIndex}" 
    color="black"
    align="center"
    scale="4 4 4"
></a-text>

<!-- ALIGN-ROW-->
<a-text
    value="row" 
    position="${alignRowX} 15.5 ${zIndex}" 
    color="black"
    align="center"
    scale="3 3 3"
></a-text>

<!-- items-start -->
<a-text 
    value="items-start" 
    position="${alignRowX} 13.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${alignRowX} 11 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;
      items: start;
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
</a-plane>

<!-- items-end -->
<a-text 
    value="items-end" 
    position="${alignRowX} 8.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${alignRowX} 6 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;
      items: end;
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
</a-plane>

<!-- items-center -->
<a-text 
    value="items-center" 
    position="${alignRowX} 3.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${alignRowX} 1 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: row;
      wrap: true;
      items: center
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
</a-plane>

<!-- ALIGN-COL-->
<a-text
    value="col" 
    position="${alignColX} 15.5 ${zIndex}" 
    color="black"
    align="center"
    scale="3 3 3"
></a-text>

<!-- items-start -->
<a-text 
    value="items-start" 
    position="${alignColX} 13.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${alignColX} 11 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: col;
      wrap: true;
      items: start
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
</a-plane>

<!-- items-end -->
<a-text 
    value="items-end" 
    position="${alignColX} 8.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${alignColX} 6 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: col;
      wrap: true;
      items: end
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
</a-plane>

<!-- items-center -->
<a-text 
    value="items-center" 
    position="${alignColX} 3.5 ${zIndex}" 
    color="black"
    align="center"
    scale="2 2 2"
></a-text>
<a-plane 
  position="${alignColX} 1 ${zIndex}" 
  width="4"
  height="4"
  material="color: #018A6C"
  flexbox="
      direction: col;
      wrap: true;
      items: center
  "
>
  <a-plane color="black" width="1.5"></a-plane>
  <a-plane color="pink" scale="1 2 2" ></a-plane>
  <a-plane color="blue"></a-plane>
</a-plane>
`;

app.appendChild(scene);