// Import A-Frame
import 'aframe';

// Import potřebné komponenty
import '../../components/flexbox/constants/constants.js';
import '../../components/flexbox/flexbox.js';
import '../../components/flexbox/Properties/flex-grow.js';
import '../../components/flexbox/Properties/flex-col.js';


document.querySelector("#app").innerHTML = `
<a-scene background="color: #FAFAFA">
  <!-- Flexbox kontejner pro demonstraci -->
  <a-plane 
    id="flex-container"
    position="0 1.5 -8"
    width="3"
    height="3"
    color="green"
    flexbox="direction: row; justify: center; items: start; wrap: true; gap: 1 0"
  >
    <!-- První řada boxů - různé flex-col hodnoty -->
    <a-box 
      width="1" 
      height="0.5" 
      depth="0.1" 
      color="red" 
      flex-col="sm:4; md:1"
      material="opacity: 0.7"
    ></a-box>
    
    <a-box 
      width="1" 
      height="0.5" 
      depth="0.1" 
      color="blue" 
      flex-col="sm:4; md:11"
      material="opacity: 0.7"
    ></a-box>
    
    <a-box 
      width="1" 
      height="0.5" 
      depth="0.1" 
      color="yellow" 
      flex-col="sm: 4; md: 4; lg: 3"
      material="opacity: 0.7"
    ></a-box>
<!--    -->
<!--    <a-box -->
<!--      width="1" -->
<!--      height="0.5" -->
<!--      depth="0.1" -->
<!--      color="yellow" -->
<!--      flex-col="sm: 12; md: 6; lg: 3"-->
<!--      material="opacity: 0.7"-->
<!--    ></a-box>-->
<!--    -->
<!--    &lt;!&ndash; Druhá řada boxů - s flex-grow &ndash;&gt;-->
<!--    <a-box -->
<!--      width="1" -->
<!--      height="0.5" -->
<!--      depth="0.1" -->
<!--      color="purple" -->
<!--      flex-col="sm: 6; lg: 3"-->
<!--      flex-grow-->
<!--      material="opacity: 0.7"-->
<!--    ></a-box>-->
<!--    -->
<!--    <a-box -->
<!--      width="1" -->
<!--      height="0.5" -->
<!--      depth="0.1" -->
<!--      color="orange" -->
<!--      flex-col="sm: 6; lg: 3"-->
<!--      flex-grow-->
<!--      material="opacity: 0.7"-->
<!--    ></a-box>-->
<!--    -->
<!--    <a-box -->
<!--      width="1" -->
<!--      height="0.5" -->
<!--      depth="0.1" -->
<!--      color="cyan" -->
<!--      flex-col="sm: 12; md: 6; lg: 6"-->
<!--      material="opacity: 0.7"-->
<!--    ></a-box>-->
<!--  </a-plane>-->
  
</a-scene>
`;

// Pro testování - vypíše na konzoli aktuální breakpoint, když se změní
document.addEventListener('DOMContentLoaded', function() {
    const scene = document.querySelector('a-scene');

    scene.addEventListener('loaded', function() {
        const items = document.querySelectorAll('[flex-col]');

        items.forEach(item => {
            item.addEventListener('breakpoint-changed', (evt) => {
                console.log(`Breakpoint změněn na: ${evt.detail.breakpoint}, šířka kontejneru: ${evt.detail.containerWidth}m`);
            });
        });

        console.log('Demo načteno! Testovací flexbox kontejner připraven.');
    });
});