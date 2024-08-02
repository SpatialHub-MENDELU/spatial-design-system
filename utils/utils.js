/** @typedef {import('aframe').Scene} AScene */
/** @typedef {import('aframe').Entity} AEntity */

import { THREE } from "aframe";

export function isObjectTrulyVisible(el) {
    if (!el.visible) return false;

    while (el.parent) {
        el = el.parent;
        if (!el.visible) return false;
    }

    return true;
}

export function getAllObjects(scene) {
    const objects = []
    scene.traverse( node => {
        if( node.isMesh){
            objects.push( node )
        }
    })
    return objects
}

export function arLog(text) {
    document.getElementById("log").innerHTML = text + "<br>" + document.getElementById("log").innerHTML
}
export function stringifyForHTML(obj) {
    return JSON.stringify(obj).replaceAll("\"", "'")
}

export function createRoundedSquareShape(size, borderRadius) {
    const shape = new THREE.Shape();
    shape.moveTo(-size + borderRadius, -size);
    shape.lineTo(size - borderRadius, -size);
    shape.quadraticCurveTo(size, -size, size, -size + borderRadius);
    shape.lineTo(size, size - borderRadius);
    shape.quadraticCurveTo(size, size, size - borderRadius, size);
    shape.lineTo(-size + borderRadius, size);
    shape.quadraticCurveTo(-size, size, -size, size - borderRadius);
    shape.lineTo(-size, -size + borderRadius);
    shape.quadraticCurveTo(-size, -size, -size + borderRadius, -size);
    return shape;
}

export function createRoundedRectShape(width, height, radius) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + radius, -height / 2);
    shape.lineTo(width / 2 - radius, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
    shape.lineTo(width / 2, height / 2 - radius);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
    shape.lineTo(-width / 2 + radius, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
    shape.lineTo(-width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
    return shape;
}

function rgbToGrayscale(r, g, b) {
    // The most commonly used conversion formula
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Get the RGB array value of a color using css
function getRGBArray(colorName) {
    const tempElem = document.createElement("div");
    
    tempElem.style.color = colorName;

    document.body.appendChild(tempElem);
    const rgb = window.getComputedStyle(tempElem).color.match(/\d+/g).map(Number);
    document.body.removeChild(tempElem);

    return rgb;
}

export function getContrast(color1, color2) {
    const rgb1 = getRGBArray(color1)
    const rgb2 = getRGBArray(color2)
    const grayscale1 = rgbToGrayscale(rgb1[0], rgb1[1], rgb1[2]);
    const grayscale2 = rgbToGrayscale(rgb2[0], rgb2[1], rgb2[2]);

    const contrast = Math.abs(grayscale1 - grayscale2);
    
    return contrast;
}

export function setContrastColor(color) {
    return getContrast(color, "black") > getContrast(color, "white") ? 'black' : 'white';
}

/**
 * Centers the geometry of a glTF model associated with an A-Frame entity.
 * Loads the glTF model from the entity's 'gltf-model' attribute, adds it to the entity, 
 * and centers its geometry.
 *
 * @param {AEntity} entity
 * @param {function(): void} onDone - a callback that is executed after the 3d model geometry is centered.
 */
export function centerGltfModelGeometry(entity, onDone) {
    const modelSrc = entity.components["gltf-model"]?.data;

    if (modelSrc) {
        new THREE.GLTFLoader().load(modelSrc, (gltf) => {
            const model = gltf.scene;
            entity.setObject3D("mesh", model);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.center();
                }
            });

            if (onDone) {
                onDone();
            }
        });
    }
}

/**
 * Executes the callback function when the A-Frame scene has fully loaded. 
 * Useful, for instance, for calculating bounding boxes.
 * @param {AScene} scene
 * @param {function(): void} callback 
 */
export function onSceneLoaded(scene, callback) {
    if (!scene) return;

    if (scene.hasLoaded) {
        callback();
    } else {
        scene.addEventListener("loaded", callback);
    }
}

/**
 * Executes the callback function when the 3D model has fully loaded.
 * Useful, for instance, to get the bounding box of the model.
 * @param {AEntity} entity
 * @param {function(): void} callback 
 */
 export function on3DModelLoaded(entity, callback) {
    if (!entity || !entity.components["gltf-model"]) {
        throw new Error("3D model is not defined or entity does not have a 3D model component");
    }

    entity.addEventListener("model-loaded", () => callback(), { once: true });
}

/**
 * Waits for the 3D model to load if set on entity, otherwise waits for the scene to load, and then executes a callback.
 * @param {AEntity} entity 
 * @param {function(): void} callback 
 */
export function onLoaded(entity, callback) {
    if (!entity) {
        throw new Error("Entity is not defined");
    }

    const is3DModel = entity.components["gltf-model"];
    
    if (is3DModel) {
        on3DModelLoaded(entity, callback);
    } else {
        onSceneLoaded(entity.sceneEl, callback);
    }
}

/**
 * Computes bounding box, based on the provided A-Frame entity.
 * @param {AEntity} entity
 * @returns {(THREE.Box3 | undefined)} computed bounding box or `undefined`, if entity or its mesh is not defined.
 */
export function computeBbox(entity) {
    if (!entity) return;

    const originalRotation = entity.object3D.rotation.clone();
    const mesh = entity.getObject3D("mesh");

    if (!mesh) return;
    
    entity.object3D.rotation.set(0, 0, 0); // reset rotation to compute correct original bbox
    entity.object3D.updateMatrixWorld(true);

    const bbox = new THREE.Box3().setFromObject(mesh);
    entity.object3D.rotation.copy(originalRotation);

    return bbox;
}