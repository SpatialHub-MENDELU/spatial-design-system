import * as AFRAME from "aframe";
import {
    center3DModelGeometry,
    computeBbox,
    onSceneLoaded,
} from "../../utils/utils.js";

AFRAME.registerComponent("flexbox", {
    schema: {
        "justify-content": { default: "start" },
        "align-items": { default: "stretch" },
        direction: { default: "row" },
        wrap: { default: false },
        gap: { type: "vec2", default: { x: 0, y: 0 } }
    },
    container: {
        width: 0,
        height: 0,
        depth: 0
    },

    init() {
        onSceneLoaded(this.el.sceneEl, () => {
            const bbox = computeBbox(this.el);
            if (bbox.isEmpty() || this.el.children.length === 0) {
                console.warn("Warning flexbox: the container has invalid bounding box or has no children");
                return;
            }

            const bboxSizeWithoutScale = bbox
                .getSize(new AFRAME.THREE.Vector3())
                .divide(this.el.object3D.scale); // clean dims of the parent

            this.container = {
                width: bboxSizeWithoutScale.x,
                height: bboxSizeWithoutScale.y,
                depth: bboxSizeWithoutScale.z
            };

            this.items = this.el.children;

            const gltfModels = this.el.querySelectorAll("[gltf-model]");

            if (gltfModels.length === 0) {
                this.setItemsLayout();
            } else {
                let gltfModelsCount = gltfModels.length; // Initialize with the number of gltf models

                this.el.addEventListener("model-loaded", (e) => {
                    gltfModelsCount--;

                    center3DModelGeometry(e.target);

                    if (gltfModelsCount === 0) {
                        this.applyLayoutWithRotationFix();
                    }
                });
            }
        });
    },

    applyLayoutWithRotationFix() {
        // Extract the rotation fix logic into a separate function
        const originalRotation = this.el.object3D.rotation.clone();
        const parent = this.el.object3D.parent;

        parent.remove(this.el.object3D);
        this.el.object3D.rotation.set(0, 0, 0);
        this.el.object3D.updateMatrixWorld(true);

        this.setGap(this.data.gap.x, this.data.gap.y);
        this.setItemsLayout();

        this.el.object3D.rotation.copy(originalRotation);
        parent.add(this.el.object3D);
    },

    setItemsLayout() {
        let xPos = -this.container.width / 2;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemBbox = computeBbox(item);
            const itemBboxSize = itemBbox
                .getSize(new AFRAME.THREE.Vector3())
                .divide(this.el.object3D.scale);

            xPos += itemBboxSize.x / 2; // Start position + half of the item's width
            item.object3D.position.set(
                xPos,
                this.container.height / 2 - itemBboxSize.y / 2,
                this.container.depth / 2 + itemBboxSize.z / 2 + this.container.height * 0.01 // Keep the z-offset for consistency
            );
            xPos += (itemBboxSize.x / 2) + this.data.gap.x; // Move xPos for the next item + gap
        }
    },
})