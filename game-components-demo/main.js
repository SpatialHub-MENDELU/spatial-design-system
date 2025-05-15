import './style.css'
import '../components/game/walk.js'
import '../components/game/gameview.js'

document.querySelector('#app').innerHTML = `
    <a-scene physics=" driver: ammo; debug: true; debugDrawMode: 1;" inspector="true">
        <!-- External files -->
        <a-asset-item id="fox" src="/models/Fox.glb"> </a-asset-item>
        <a-asset-item id="lion" src="/models/Lion.glb"> </a-asset-item>
        
        <!--  sky    -->
        <a-sky color="#eeeeee"></a-sky>
        
        <!-- ground  --> 
        <a-box ammo-body="type: static;" ammo-shape="type: box" position="0 0 0" rotation="-90 0 0" width="40" height="40" depth="1" color="#008800"></a-box>
        
        <!-- Obstacles -->
        <a-entity id="lion-character" ammo-body="type: static;" position="7 2.3 -5" rotation="0 -30 0">
            <a-entity  gltf-model="#lion" ammo-shape="type: hull" position="0 -1.7 0.8" scale="0.5 0.5 0.5" ></a-entity>
        </a-entity>
        
        <!-- Characters -->
        <a-entity walk id="fox-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 1.8 0">
            <a-entity gltf-model="#fox" ammo-shape="type: hull;" position="0 -1.3 0.2" scale="1 1 1" ></a-entity>
        </a-entity>

        <!-- Camera -->
<!--        <a-entity camera look-controls position="0 4 20" ></a-entity>-->
        <a-entity camera gameview="target: #fox-character" rotation="-30 0 0"></a-entity>
        
    </a-scene>
`
