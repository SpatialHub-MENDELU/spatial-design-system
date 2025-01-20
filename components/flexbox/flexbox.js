import * as AFRAME from "aframe";
import {
    center3DModelGeometry,
    computeBbox,
    onSceneLoaded,
} from "../../utils/utils.js";

AFRAME.registerComponent("flexbox", {
    schema: {
        justify: { default: "start" }, // start | end | center | between | around
        items: { default: "start" }, // start | end | center
        direction: { default: "row" }, // row | col
        wrap: { default: false },
        gap: { type: "vec2", default: { x: 0, y: 0 } }
    },
    container: {
        width: 0,
        height: 0,
        depth: 0
    },
    items: [],
    lines: [],

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
        if(this.data.direction === "row"){
            if(this.data.wrap) {
                this.setRowItemsLayoutWrap()
            } else {
                this.setRowItemsLayout()
            }
        } else{
            if(this.data.wrap) {
                this.setColItemsLayoutWrap()
            } else {
                this.setColItemsLayout()
            }
        }
        this.applyGrow()

        // SetTimeout is necessary to wait for grow to be applied for further size calculations
        setTimeout(
            () => {
                this.applyAlignItems()
                this.applyJustifyContent()
            },
            0
        )
    },

    setRowItemsLayout() {
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

    setColItemsLayout() {
        let yPos = this.container.height / 2; // Start at the top

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemBbox = computeBbox(item);
            const itemBboxSize = itemBbox
                .getSize(new AFRAME.THREE.Vector3())
                .divide(this.el.object3D.scale);

            yPos -= itemBboxSize.y / 2;
            item.object3D.position.set(
                -this.container.width / 2 + itemBboxSize.x / 2, // x-position: left-aligned
                yPos,
                this.container.depth / 2 + itemBboxSize.z / 2 + this.container.height * 0.01
            );
            yPos -= (itemBboxSize.y / 2) + this.data.gap.y;
        }
    },

    setRowItemsLayoutWrap() {
        this.lines = [[]]; // Initialize lines array
        let currentLine = this.lines[0];
        let xPos = -this.container.width / 2;
        let yPos = this.container.height / 2;
        let currentLineHeight = 0;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemBbox = computeBbox(item);
            const itemBboxSize = itemBbox
                .getSize(new AFRAME.THREE.Vector3())
                .divide(this.el.object3D.scale);

            xPos += itemBboxSize.x / 2;

            const doesItemNotFit = xPos + itemBboxSize.x / 2 > this.container.width / 2
            if (doesItemNotFit) {
                // Move to the next line
                xPos = -this.container.width / 2 + itemBboxSize.x / 2;
                yPos -= currentLineHeight + this.data.gap.y;
                currentLineHeight = 0; // Reset line height for the new line
                currentLine = []; // Start a new line
                this.lines.push(currentLine);
            }

            item.object3D.position.set(
                xPos,
                yPos - itemBboxSize.y / 2,
                this.container.depth / 2 + itemBboxSize.z / 2 + this.container.height * 0.01
            );

            xPos += itemBboxSize.x / 2 + this.data.gap.x;
            currentLineHeight = Math.max(currentLineHeight, itemBboxSize.y); // Update line height
            currentLine.push(item); // Add item to the current line
        }
    },

    setColItemsLayoutWrap() {
        this.lines = [[]]; // Initialize lines array
        let currentLine = this.lines[0];
        let xPos = -this.container.width / 2;
        let yPos = this.container.height / 2;
        let currentLineWidth = 0;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemBbox = computeBbox(item);
            const itemBboxSize = itemBbox
                .getSize(new AFRAME.THREE.Vector3())
                .divide(this.el.object3D.scale);

            yPos -= itemBboxSize.y / 2;

            const doesItemNotFit = yPos - itemBboxSize.y / 2 < -this.container.height / 2
            if (doesItemNotFit) {
                // Move to the next column
                yPos = this.container.height / 2 - itemBboxSize.y / 2;
                xPos += currentLineWidth + this.data.gap.x;
                currentLineWidth = 0; // Reset line width for the new column
                currentLine = []; // Start a new column
                this.lines.push(currentLine);
            }

            item.object3D.position.set(
                xPos + itemBboxSize.x / 2,
                yPos,
                this.container.depth / 2 + itemBboxSize.z / 2 + this.container.height * 0.01
            );

            yPos -= itemBboxSize.y / 2 + this.data.gap.y;
            currentLineWidth = Math.max(currentLineWidth, itemBboxSize.x); // Update column width
            currentLine.push(item); // Add item to the current column
        }
    },

    applyGrow() {
        const GROW_DIRECTION = this.data.direction === "row" ? "width" : "height";
        const GROW_DIMENSION = this.data.direction === "row" ? "x" : "y";

        this.lines.forEach(line => {
            let freeSpace = this.container[GROW_DIRECTION] - this.data.gap[GROW_DIMENSION] * (line.length - 1);

            line.forEach(item => {
                const itemBbox = computeBbox(item);
                const itemBboxSize = itemBbox
                    .getSize(new AFRAME.THREE.Vector3())
                    .divide(this.el.object3D.scale);

                freeSpace -= itemBboxSize[GROW_DIMENSION];
            })

            const growItems = line.filter(item => (
                item.getAttribute("flex-grow") !== null
                && item.getAttribute("flex-grow") !== "false"
            ));
            const freeSpacePerItem = freeSpace / growItems.length;

            const ORIGINAL_DIRECTION_ATTRIBUTE = `original-${GROW_DIRECTION}`;

            growItems.forEach(growItem => {
                if(!growItem.hasAttribute(ORIGINAL_DIRECTION_ATTRIBUTE)) {
                    growItem.setAttribute(ORIGINAL_DIRECTION_ATTRIBUTE, growItem.getAttribute(GROW_DIRECTION) || '1');
                }

                growItem.setAttribute(GROW_DIRECTION, +growItem.getAttribute(ORIGINAL_DIRECTION_ATTRIBUTE) + freeSpacePerItem);

                if(this.data.direction === "row") {
                    growItem.object3D.position[GROW_DIMENSION] += freeSpacePerItem / 2;
                } else {
                    growItem.object3D.position[GROW_DIMENSION] -= freeSpacePerItem / 2;
                }


                const inLineIndex = line.indexOf(growItem);
                for (let i = inLineIndex + 1; i < line.length; i++) {
                    if(this.data.direction === "row") {
                        line[i].object3D.position[GROW_DIMENSION] += freeSpacePerItem;
                    } else {
                        line[i].object3D.position[GROW_DIMENSION] -= freeSpacePerItem;
                    }
                }
            })
        })
    },

    applyJustifyContent() {
        this.lines.forEach(line => {
            const freeSpace = this.getFreeSpaceForLine(line);
            const lineStart = this.getLineStartPos(line);

            switch (this.data.justify) {
                case "start":
                    // No action needed, items are already at the start
                    break;
                case "end":
                    this.shiftLine(line, freeSpace, lineStart);
                    break;
                case "center":
                    this.shiftLine(line, freeSpace / 2, lineStart);
                    break;
                case "between":
                    this.distributeSpaceBetween(line, freeSpace, lineStart);
                    break;
                case "around":
                    this.distributeSpaceAround(line, freeSpace, lineStart);
                    break;
            }
        });
    },
    getItemBboxSize(item) {
        const itemBbox = computeBbox(item);

        return itemBbox
            .getSize(new AFRAME.THREE.Vector3())
            .divide(this.el.object3D.scale);
    },

    // Helper functions for justify-content
    getFreeSpaceForLine(line) {
        const mainAxis = this.data.direction === "row" ? "x" : "y";
        const mainAxisSize = this.data.direction === "row" ? "width" : "height";

        let usedSpace = this.data.gap[mainAxis] * (line.length - 1);
        line.forEach(item => usedSpace += this.getItemBboxSize(item)[mainAxis]);

        console.log('usedSpace', usedSpace)

        return this.container[mainAxisSize] - usedSpace;
    },

    getLineStartPos(line) {
        const mainAxis = this.data.direction === "row" ? "x" : "y";
        return line[0].object3D.position[mainAxis] - this.getItemBboxSize(line[0])[mainAxis] / 2;
    },

    shiftLine(line, freeSpace, lineStart) {
        line.forEach(item => {
            if(this.data.direction === "row") {
                item.object3D.position.x += freeSpace;
            } else {
                item.object3D.position.y -= freeSpace;
            }
        });
    },

    distributeSpaceBetween(line, freeSpace, lineStart) {
        const spacing = freeSpace / (line.length - 1);

        for (let i = 1; i < line.length; i++) {
            if(this.data.direction === "row"){
                line[i].object3D.position.x += spacing * i;
            } else {
                line[i].object3D.position.y -= spacing * i;
            }
        }
    },

    distributeSpaceAround(line, freeSpace, lineStart) {
        const spacing = freeSpace / line.length;

        line.forEach((item, i) => {
            if(this.data.direction === "row"){
                item.object3D.position.x += spacing * (i + 0.5);
            } else {
                item.object3D.position.y -= spacing * (i + 0.5);
            }

        });
    },

    applyAlignItems() {
        const crossAxis = this.data.direction === "row" ? "y" : "x";
        const CROSS_DIRECION = this.data.direction === "row" ? "height" : "width";

        this.lines.forEach((line, lineIndex) => {
            const contentPadding = this.container[CROSS_DIRECION] - this.getContentSize(crossAxis)
            console.log('contentPadding', contentPadding)
            let maxCrossSize = Math.max(...line.map(item => this.getItemBboxSize(item)[crossAxis]));

            line.forEach(item => {
                const itemCrossSize = this.getItemBboxSize(item)[crossAxis];
                let offset = 0;

                switch (this.data.items) {
                    case "start":
                        // For 'start', adjust the first line to align to the top/left edge
                        // if (lineIndex === 0) {
                        //     offset = this.container.height / 2 - maxCrossSize / 2 - this.getItemBboxSize(item).y / 2 - contentPadding;
                        // }
                        break;
                    case "center":
                        offset = -((maxCrossSize - itemCrossSize) / 2 + contentPadding / this.lines.length);
                        break;
                    case "end":
                        offset = maxCrossSize - itemCrossSize + (this.data.direction === 'row' ? -contentPadding : contentPadding);
                        break;
                }
                console.log('offset', offset)
                if (this.data.direction === "row") {
                    item.object3D.position.y += offset;
                } else {
                    item.object3D.position.x += offset;
                }
            });
        });
    },

    /**
     * Calculates the total size of the content along the specified axis.
     *
     * @param {string} axis - The axis to calculate the content size for ('x' or 'y').
     * @returns {number} - The total size of the content along the specified axis.
     */
    getContentSize(axis) {
        return this.lines
            .map(line => {
                let lineSize = 0;

                line.forEach(item => {
                    lineSize = Math.max(this.getItemBboxSize(item)[axis], lineSize)
                });

                return lineSize
            })
            .reduce((acc, val) => acc + val, 0)
            // Add gaps
            + (this.data.gap[axis] * (this.lines.length - 1));
    }
})