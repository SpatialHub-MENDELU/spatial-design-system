import './style.css'

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

        <!-- Camera -->
        <a-entity camera look-controls wasd-controls position="0 8 20" ></a-entity>
        
    </a-scene>
`
