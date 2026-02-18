import './style.css'
import '../components/game/walk.js'
import '../components/game/gameview.js'
import '../components/game/npcWalk.js'
import '../components/game/fly.js'



document.querySelector('#app').innerHTML = `
    <a-scene physics=" driver: ammo; debug: true; debugDrawMode: 1;" inspector="true">
        <!-- External files -->
        <a-asset-item id="fox" src="/models/Fox.glb"> </a-asset-item>
        <a-asset-item id="lion" src="/models/Lion.glb"> </a-asset-item>
        <a-asset-item id="dragon" src="/models/Dragon.glb"> </a-asset-item>
        <a-asset-item id="dog" src="/models/Dog.glb"> </a-asset-item>
        <a-asset-item id="monster" src="/models/Monster.glb"> </a-asset-item>
        <a-asset-item id="plane" src="/models/Airplane.glb"></a-asset-item>
        <a-asset-item id="paper-airplane" src="/models/PaperAirplane.glb"></a-asset-item>
        
        <!--  sky    -->
        <a-sky color="#eeeeee"></a-sky>
        
        <!-- ground  --> 
        <a-box ammo-body="type: static;" ammo-shape="type: box" position="0 0 0" rotation="-90 0 0" width="40" height="40" depth="1" color="#008800"></a-box>
        
        <!-- Obstacles -->
<!--        <a-entity id="lion-character" ammo-body="type: static;" position="7 2.3 -5" rotation="0 -30 0">-->
<!--            <a-entity  gltf-model="#lion" ammo-shape="type: hull" position="0 -1.7 0.8" scale="0.5 0.5 0.5" ></a-entity>-->
<!--        </a-entity>-->
<!--        -->
        <!-- Characters -->
<!--        <a-entity walk id="fox-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 1.8 0">-->
<!--            <a-entity gltf-model="#fox" ammo-shape="type: hull;" position="0 -1.3 0.2" scale="1 1 1" ></a-entity>-->
<!--        </a-entity>-->
        

<!--        <a-entity fly id="dragon-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 0.2 0" rotation="0 0 0">-->
<!--            <a-entity gltf-model="#dragon" ammo-shape="type: hull;" position="0 -2.1 0" scale="1 1 1" ></a-entity>-->
<!--        </a-entity>-->


 <!---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------->
<!-------  UNCOMMENT ONE OF THE FLYING TYPES (WITH CAMERA) HERE:  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------->

        <!-- FREE DIRECTIONAL TYPE-->
<!--        <a-entity fly="type: freeDirectionalFlight; forwardOffsetAngle: 0; maxPitchDeg: 20; pitchSpeed: 120; maxRollDeg: 15; rollSpeed: 60; rotationSpeed: 60; sprint: true;" id="monster-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 0.2 0" rotation="0 180 0">-->
<!--            <a-entity gltf-model="#monster" ammo-shape="type: hull;" position="0 -1.7 0" scale="1 1 1" ></a-entity>-->
<!--        </a-entity>-->
<!--        <a-entity camera gameview="target: #monster-character" rotation="-30 0 0"></a-entity>-->


<!--         AUTO FORWARD TYPE -->
<!--        <a-entity fly="type: autoForward; forwardOffsetAngle: 270; maxPitchDeg: 20; pitchSpeed: 100; maxRollDeg: 25; rollSpeed: 100; rotationSpeed: 40; " id="plane-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 0.2 0" rotation="0 180 0">-->
<!--            <a-entity gltf-model="#plane" ammo-shape="type: hull;" position="0.8 -1.2 0" scale="0.2 0.2 0.2" rotation="0 0 0"></a-entity>-->
<!--        </a-entity>-->
<!--        <a-entity camera gameview="target: #plane-character" rotation="-30 0 0"></a-entity>-->

<!--         AUTO FORWARD FIXED DIRECTION TYPE -->
<!--        <a-entity fly="type: autoForwardFixedDirection; forwardOffsetAngle: 180; maxPitchDeg: 10; pitchSpeed: 120; maxRollDeg: 15; rollSpeed: 80; " id="paper-airplane-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 1 0" rotation="0 180 0">-->
<!--            <a-entity gltf-model="#paper-airplane" ammo-shape="type: hull;" position="0 0 0" scale="0.01 0.01 0.01" ></a-entity>-->
<!--        </a-entity>-->
<!--        <a-entity camera gameview="target: #paper-airplane-character" rotation="-30 0 0"></a-entity>-->


 <!---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------->
 <!---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------->


        <!-- NPC Character -->
        
        <!-- stopAtLastPoint -->
<!--        <a-entity npc-walk="stopAtLastPoint: true;" id="dog-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="-2 1.8 -2" >-->
<!--            <a-entity gltf-model="#dog" ammo-shape="type: hull;" position="0 -1.5 0" scale="3 3 3" ></a-entity>-->
<!--        </a-entity>-->
        
        <!-- enable altitude -->
        <a-entity npc-walk="idleClipName: *Flying_Idle*; walkClipName: *Flying_Idle*; altitude: true; horizontalPointTolerance: 0.1;" id="monster-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 0.2 0" rotation="0 180 0">
            <a-entity gltf-model="#monster" ammo-shape="type: hull;" position="0 -1.7 0" scale="1 1 1" ></a-entity>
        </a-entity>


        <!-- Camera -->
        <a-entity camera  wasd-controls rotation="-40 0 0" position="0 10 20" ></a-entity>
<!--        <a-entity camera gameview="target: #plane-character" rotation="-30 0 0"></a-entity>-->
        
    </a-scene>
`
