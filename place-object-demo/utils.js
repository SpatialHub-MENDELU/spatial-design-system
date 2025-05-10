import { THREE } from "aframe";
import { center3DModelGeometry } from "../utils/utils";

/**
 * Creates a simple identifier for object3D copy in a format `'copy_of_object3DId'`,
 * where `object3DId` is the id of the passed object.
 * 
 * @param {THREE.Object3D} object3D - original object3D.
 * @returns an identifier for object3D copy.
 */
function createObject3DCopyIdentifier(object3D) {
    return `copy_of_${object3D.id}`;
}

/**
 * 
 * @param {{ src: string, id: string, altText?: string }[]} items 
 * @returns string that contains `<a-assets></a-assets>`, inside of which are `a-asset-item` elements.
 */
function createAssetItems(items) {
    let assetItems = "";
    
    items.forEach(i => {
        assetItems += `<a-asset-item id="${i.id}" src="${i.src}" data-alt-text="${i.altText ?? ''}"></a-asset-item>\n`;
    });

    return `<a-assets>${assetItems}</a-assets>`
}

/**
 * 
 * @param {{ src: string, id: string, altText?: string }[]} items
 * @returns string that contains `a-entity` elements with gltf models (src set to the item id).
 */
function create3DModels(items) {
    let entities = "";
    
    items.forEach(i => {
        entities += `<a-entity gltf-model="#${i.id}" class="menu-item" id="menu-item-${i.id}" data-model-id="${i.id}"></a-entity>\n`;
    });

    return entities;
}

function updateMenuItemsEnabledState(placedEntitiesIds) {
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
        const id = item.id.replace("menu-item-", "");
        const isItemPlaced = placedEntitiesIds.includes(id);
        item.setAttribute("data-disabled", isItemPlaced);
        item.setAttribute("model-opacity", isItemPlaced ? 0.25 : 1);
    });
}

/**
 * Extracts the filename from the rest of the path.
 * Doesn't handle if the passed `path` is valid.
 * @param {string} path
 * @returns extracted filename. For example: `./folder1/folder2/filename.ext` -> `filename.ext`.
 */
function getFileName(path) {
    if (!path) return path;

    const lastSlashIndex = path.lastIndexOf("/");
    return path.slice(lastSlashIndex + 1);
}

/**
 * Creates a copy for the passed entity. NOTE: if the passed entity has a 3D model, 
 * its geometry will be centered in order to achieve the same positioning as with the A-Frame primitives.
 * @param {AFRAME.AEntity} ent
 * @returns {Promise<AFRAME.AEntity>}
 */
function createEntityCopy(ent) {
  return new Promise((resolve, reject) => {
    const entityCopy = document.createElement("a-entity");
    entityCopy.setAttribute("data-object3d-copy-of", ent.object3D.id);
    // For context menu
    entityCopy.setAttribute("data-touch-raycaster-receiver", true);
    entityCopy.setAttribute("gltf-model", ent.components["gltf-model"]?.data);
    entityCopy.setAttribute("data-model-id", ent.getAttribute("data-model-id"));

    ent.sceneEl.appendChild(entityCopy);

    entityCopy.addEventListener("model-loaded", () => {
      center3DModelGeometry(entityCopy);
      resolve(entityCopy);
    }, { once: true });
  });
}

export { createObject3DCopyIdentifier, createAssetItems, getFileName, createEntityCopy, create3DModels, updateMenuItemsEnabledState };