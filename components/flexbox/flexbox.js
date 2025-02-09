import * as AFRAME from "aframe";
import {
    center3DModelGeometry,
    computeBbox,
    onSceneLoaded,
} from "../../utils/utils.js";

import {DIRECTION, ITEMS, JUSTIFY} from "./constants/constants.js";

AFRAME.registerComponent("flexbox", {
    schema: {
        direction: { default: DIRECTION.ROW },     // row | col
        justify: { default: JUSTIFY.START },    // start | end | center | between | around
        items: { default: ITEMS.START },        // start | end | center
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
    MAIN_AXIS: "", // x/y
    CROSS_AXIS: "", // y/x
    MAIN_DIMENSION: "", // width | height
    CROSS_DIMENSION: "", // height | width

    init() {
        onSceneLoaded(this.el.sceneEl, () => this.handleSceneLoaded());
    },

    handleSceneLoaded() {
        if (!this.validateContainer()) {
            return;
        }

        this.initializeContainer();
        this.handleModels();
    },

    validateContainer() {
        const bbox = computeBbox(this.el);
        if (bbox.isEmpty() || this.el.children.length === 0) {
            console.warn("Warning flexbox: the container has invalid bounding box or has no children");

            return false;
        }

        return true;
    },

    initializeContainer() {
        const bbox = computeBbox(this.el);
        const bboxSizeWithoutScale = bbox
            .getSize(new AFRAME.THREE.Vector3())
            .divide(this.el.object3D.scale);

        this.container = {
            width: bboxSizeWithoutScale.x,
            height: bboxSizeWithoutScale.y,
            depth: bboxSizeWithoutScale.z
        };
        this.items = this.el.children;

        switch(this.isDirectionRow()) {
            case true:
                this.MAIN_AXIS = "x";
                this.CROSS_AXIS = "y";
                this.MAIN_DIMENSION = "width";
                this.CROSS_DIMENSION = "height";
                break;
            case false:
                this.MAIN_AXIS = "y";
                this.CROSS_AXIS = "x";
                this.MAIN_DIMENSION = "height";
                this.CROSS_DIMENSION = "width";
        }
    },


    handleModels() {
        const gltfModels = this.el.querySelectorAll("[gltf-model]");

        if (gltfModels.length === 0) {
            this.setItemsLayout();
            return;
        }

        this.setupModelLoadTracking(gltfModels.length);
    },

    setupModelLoadTracking(totalModels) {
        let loadedModels = 0;

        this.el.addEventListener("model-loaded", (e) => {
            loadedModels++;
            center3DModelGeometry(e.target);

            if (loadedModels === totalModels) {
                this.applyLayoutWithRotationFix();
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

        this.setItemsLayout();

        this.el.object3D.rotation.copy(originalRotation);
        parent.add(this.el.object3D);
    },

    async setItemsLayout() {
        if(this.isDirectionRow()){
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
        // It is necessary to wait for grow to be applied for further size calculations
        Promise.resolve().then(() => {
            this.applyGrow()

            Promise.resolve().then(() => {
                this.applyJustifyContent()
                this.applyAlignItems()
            })
        })
    },

    setRowItemsLayout() {
        const lines = [[]]; // Initialize lines array
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
            lines[0].push(item);
        }
    },

    setColItemsLayout() {
        const lines = [[]]; // Initialize lines array
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
            lines[0].push(item);
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

            const itemDoesNotFit = xPos + itemBboxSize.x / 2 > this.container.width / 2
            if (itemDoesNotFit) {
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
        this.lines.forEach(line => {
            let freeSpace = this.container[this.MAIN_DIMENSION] - this.data.gap[this.MAIN_AXIS] * (line.length - 1);

            line.forEach(item => {
                const itemBbox = computeBbox(item);
                const itemBboxSize = itemBbox
                    .getSize(new AFRAME.THREE.Vector3())
                    .divide(this.el.object3D.scale);

                freeSpace -= itemBboxSize[this.MAIN_AXIS];
            })

            const growItems = line.filter(item => (
                item.getAttribute("flex-grow") !== null
                && item.getAttribute("flex-grow") !== "false"
            ));
            const freeSpacePerItem = freeSpace / growItems.length;

            const ORIGINAL_DIRECTION_ATTRIBUTE = `original-${this.MAIN_DIMENSION}`;

            growItems.forEach(growItem => {
                if(!growItem.hasAttribute(ORIGINAL_DIRECTION_ATTRIBUTE)) {
                    growItem.setAttribute(ORIGINAL_DIRECTION_ATTRIBUTE, growItem.getAttribute(this.MAIN_DIMENSION) || '1');
                }

                growItem.setAttribute(this.MAIN_DIMENSION, +growItem.getAttribute(ORIGINAL_DIRECTION_ATTRIBUTE) + freeSpacePerItem);

                if(this.isDirectionRow()) {
                    growItem.object3D.position[this.MAIN_AXIS] += freeSpacePerItem / 2;
                } else {
                    growItem.object3D.position[this.MAIN_AXIS] -= freeSpacePerItem / 2;
                }


                const inLineIndex = line.indexOf(growItem);
                for (let i = inLineIndex + 1; i < line.length; i++) {
                    if(this.isDirectionRow()) {
                        line[i].object3D.position[this.MAIN_AXIS] += freeSpacePerItem;
                    } else {
                        line[i].object3D.position[this.MAIN_AXIS] -= freeSpacePerItem;
                    }
                }
            })
        })
    },

    applyJustifyContent() {
        this.lines.forEach(line => {
            const freeSpace = this.getFreeSpaceForLineJustify(line);

            switch (this.data.justify) {
                case JUSTIFY.START:
                    // No action needed, items are already at the start
                    break;
                case JUSTIFY.END:
                    this.shiftJustifiedLine(line, freeSpace);
                    break;
                case JUSTIFY.CENTER:
                    this.shiftJustifiedLine(line, freeSpace / 2);
                    break;
                case JUSTIFY.BETWEEN:
                    this.distributeSpaceBetween(line, freeSpace);
                    break;
                case JUSTIFY.AROUND:
                    this.distributeSpaceAround(line, freeSpace);
                    break;
            }
        });
    },

    // Helper functions for justify-content
    getFreeSpaceForLineJustify(line) {
        let usedSpace = this.data.gap[this.MAIN_AXIS] * (line.length - 1);
        line.forEach(item => usedSpace += this.getItemBboxSize(item)[this.MAIN_AXIS]);

        return this.container[this.MAIN_DIMENSION] - usedSpace;
    },

    shiftJustifiedLine(line, freeSpace) {
        line.forEach(item => {
            if(this.isDirectionRow()) {
                item.object3D.position.x += freeSpace;
            } else {
                item.object3D.position.y -= freeSpace;
            }
        });
    },

    distributeSpaceBetween(line, freeSpace) {
        const spacing = freeSpace / (line.length - 1);

        for (let i = 1; i < line.length; i++) {
            if(this.isDirectionRow()){
                line[i].object3D.position.x += spacing * i;
            } else {
                line[i].object3D.position.y -= spacing * i;
            }
        }
    },

    distributeSpaceAround(line, freeSpace) {
        const spacing = freeSpace / line.length;

        line.forEach((item, i) => {
            if(this.isDirectionRow()){
                item.object3D.position.x += spacing * (i + 0.5);
            } else {
                item.object3D.position.y -= spacing * (i + 0.5);
            }

        });
    },

    applyAlignItems() {
        const freeSpace = this.getFreeSpaceForLineItems(this.lines[0]);

        this.lines.forEach((line) => {
            const maxCrossSizeInLine = this.getMaxLineSizeInAxis(line, this.CROSS_AXIS);

            switch (this.data.items) {
                case ITEMS.START:
                    // No adjustment needed
                    break;
                case ITEMS.CENTER:
                    line.forEach(item => {
                        if(this.isDirectionRow()) {
                            item.object3D.position.y -= (freeSpace/2);
                            item.object3D.position.y -= (maxCrossSizeInLine - this.getItemBboxSize(item)[this.CROSS_AXIS]) / 2;
                        } else {
                            item.object3D.position.x += (freeSpace/2);
                            item.object3D.position.x += (maxCrossSizeInLine - this.getItemBboxSize(item)[this.CROSS_AXIS]) / 2
                        }
                    });
                    break;
                case ITEMS.END:
                    line.forEach(item => {
                        if(this.isDirectionRow()) {
                            item.object3D.position.y -= (freeSpace);
                            item.object3D.position.y -= ((maxCrossSizeInLine - this.getItemBboxSize(item)[this.CROSS_AXIS]));
                        } else {
                            item.object3D.position.x += (freeSpace);
                            item.object3D.position.x += (maxCrossSizeInLine - this.getItemBboxSize(item)[this.CROSS_AXIS]);
                        }
                    });
                    break;
            }
        });
    },

    getFreeSpaceForLineItems(line) {
        let usedSpace = this.data.gap[this.CROSS_AXIS] * (line.length - 1);

        const maxCrossSizeInLine = this.getMaxLineSizeInAxis(line, this.CROSS_AXIS);
        usedSpace += maxCrossSizeInLine;

        // Add size of next lines
        const lineIndex = this.lines.indexOf(line);
        for(let i = lineIndex + 1; i < this.lines.length; i++) {
            const maxCrossSizeInNextLine = Math.max(...this.lines[i].map(item => this.getItemBboxSize(item)[this.CROSS_AXIS]));
            usedSpace += maxCrossSizeInNextLine;
        }

        return this.container[this.CROSS_DIMENSION] - usedSpace;
    },

    /*
     * Helper functions
     */
    isDirectionRow() {
        return this.data.direction === DIRECTION.ROW;
    },

    getItemBboxSize(item) {
        const itemBbox = computeBbox(item);

        return itemBbox
            .getSize(new AFRAME.THREE.Vector3())
            .divide(this.el.object3D.scale);
    },

    getMaxLineSizeInAxis(line, axis) {
        return Math.max(...line.map(item => this.getItemBboxSize(item)[axis]))
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
    },
})