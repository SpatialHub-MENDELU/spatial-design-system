import './style.css'
import '../../components/game/walk.js'
import '../../components/game/gameview.js'
import '../../components/game/npcWalk.js'
import '../../components/game/fly.js'

document.querySelector('#app').innerHTML = `
    <a-scene physics=" driver: ammo; debug: true; debugDrawMode: 1;" inspector="true">
        <a-asset-item id="fox" src="./models/Fox.glb"> </a-asset-item>
        <a-asset-item id="lion" src="./models/Lion.glb"> </a-asset-item>
        <a-asset-item id="dragon" src="./models/Dragon.glb"> </a-asset-item>
        <a-asset-item id="dog" src="./models/Dog.glb"> </a-asset-item>
        <a-asset-item id="monster" src="./models/Monster.glb"> </a-asset-item>
        <a-asset-item id="plane" src="./models/Airplane.glb"></a-asset-item>
        <a-asset-item id="paper-airplane" src="./models/PaperAirplane.glb"></a-asset-item>

        <a-sky color="#eeeeee"></a-sky>

        <a-box ammo-body="type: static;" ammo-shape="type: box" position="0 0 0" rotation="-90 0 0" width="40" height="40" depth="1" color="#008800"></a-box>

        <a-entity walk="sprint: true;" id="fox-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 1.8 0">
            <a-entity gltf-model="#fox" ammo-shape="type: hull;" position="0 -1.3 0.2" scale="1 1 1" ></a-entity>
        </a-entity>

        <a-entity npc-walk="idleClipName: *Flying_Idle*; walkClipName: *Flying_Idle*; altitude: true; horizontalPointTolerance: 0.1;" id="monster-character" ammo-body="type: dynamic; angularFactor: 0 0 0; mass: 20; activationState: disableDeactivation" position="0 0.2 0" rotation="0 180 0">
            <a-entity gltf-model="#monster" ammo-shape="type: hull;" position="0 -1.7 0" scale="1 1 1" ></a-entity>
        </a-entity>

        <a-entity camera game-view="target: #fox-character; type: thirdPersonFollow;" rotation="-30 0 0"></a-entity>

    </a-scene>
`
