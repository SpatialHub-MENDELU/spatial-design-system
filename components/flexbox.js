import * as AFRAME from "aframe";
import { centerGltfModelGeometry } from "../utils/utils.js";

AFRAME.registerComponent("flexbox", {
    schema: {
        mainAlign: { type: "string", default: "start" },
        secondaryAlign: { type: "string", default: "stretch" },
        direction: { type: "string", default: "row" },
        wrap: { type: "boolean", default: false },
        gap: { type: "vec2", default: { x: 0, y: 0 } }
    },

    init() {
        this.el.addEventListener("loaded", () => {
            const mesh = this.el.getObject3D("mesh");

            if (!mesh || !mesh.geometry || this.el.children.length === 0) return

            this.container = {
                width: mesh.geometry.parameters.width,
                height: mesh.geometry.parameters.height,
                depth: mesh.geometry.parameters.depth
            };

            let gltfModelsCount = 0;

            this.items = Array.from(this.el.children, (child) => {
                if (child.getAttribute("gltf-model")) {
                    gltfModelsCount++;
                    // Centering gltf model geometry, so it's properly positioned like aframe primitives
                    centerGltfModelGeometry(child);
                }

                return child;
            });

            if (gltfModelsCount === 0) {
                this.setGap(this.data.gap.x, this.data.gap.y);
                this.setItemsLayout();
            } else {
                this.el.addEventListener("model-loaded", () => {
                    gltfModelsCount--;

                    if (gltfModelsCount === 0) {
                        // All models were loaded

                        const tempContainerRotation = this.el.object3D.rotation.clone();

                        // Reset container rotation for correct calculation of bounding boxes of items with gltf models
                        this.el.object3D.rotation.set(0, 0, 0);
                        this.el.object3D.updateMatrixWorld();

                        this.setGap(this.data.gap.x, this.data.gap.y);
                        this.setItemsLayout();

                        this.el.object3D.rotation.copy(tempContainerRotation);
                    }
                });
            }
        });
    },

    /**
     * Sets the gap that is used for item scaling and positioning, normalizing values between 0 and 1.
     * @param {number} x - The horizontal gap percentage between 0 and 100 (excluded).
     * @param {number} y - The vertical gap percentage between 0 and 100 (excluded).
     */
    setGap(x, y) {
        const isColumnDirection = this.data.direction === "column";
        const isJustifiedSpace = this.data.mainAlign === "space-around" || this.data.mainAlign === "space-between";

        let gapX = x > 0 && x < 100 ? x / 100 : 0;
        let gapY = y > 0 && y < 100 ? y / 100 : 0;

        if (isJustifiedSpace) {
            const [containerWidthPerItem, containerHeightPerItem] = this.getContainerWidthAndHeightPerItem(isColumnDirection);                    
            
            const numberOfWraps = this.getNumberOfWraps(isColumnDirection);
            const itemsOffset = Math.ceil((this.items.length / numberOfWraps)) - 1; 
            
            if (isColumnDirection) {
                gapY = (containerHeightPerItem * 0.5 / this.container.height) * itemsOffset;
            } else {
                gapX = (containerWidthPerItem * 0.5 / this.container.width) * itemsOffset;
            }
        }

        this.normalizedGap = { x: gapX, y: gapY };
    },

    /**
     * Sets the overall layout of the items, i.e. their position and scale inside the flexbox.
     */
    setItemsLayout() {
        const isColumnDirection = this.data.direction === "column";
        const isStretchAlignment = this.data.secondaryAlign === "stretch";

        const containerWidth = this.container.width;
        const containerHeight = this.container.height;
        // If it's 3D shape, take its depth; otherwise, set it to zero for 2D shapes
        const containerDepth = this.container.depth || 0;
        const [containerWidthPerItem, containerHeightPerItem] = this.getContainerWidthAndHeightPerItem(isColumnDirection);

        const [xOffsetFromOrigin, yOffsetFromOrigin] = this.getItemOriginOffsets(isColumnDirection);
        const [mainAlignOffset, secondaryAlignOffset] = this.getAlignmentOffsets(isColumnDirection);

        const numberOfWraps = this.getNumberOfWraps(isColumnDirection);

        let rowIndex = 0, colIndex = 0;

        for (let itemIndex = 0; itemIndex < this.items.length; itemIndex++) {
            /** @type {AFRAME.AEntity} */
            const item = this.items[itemIndex];
            const itemBbox = new THREE.Box3().setFromObject(item.getObject3D("mesh"));
            const itemBboxSize = itemBbox.getSize(new THREE.Vector3());

            const xPos = (-containerWidth / 2) + containerWidthPerItem / 2 + xOffsetFromOrigin;
            const yPos = containerHeight / 2 - containerHeightPerItem / 2 + yOffsetFromOrigin;
            const zPos = containerDepth / 2 + itemBboxSize.z / 2;

            const xOffset = colIndex * mainAlignOffset;
            const yOffset = rowIndex + secondaryAlignOffset;

            if (isColumnDirection) {
                item.object3D.position.x = xPos + yOffset;
                item.object3D.position.y = yPos - xOffset;
            } else {
                item.object3D.position.x = xPos + xOffset;
                item.object3D.position.y = yPos - yOffset;
            }

            // Adding a small value prevents overlap issues where multiple 2D shapes share the same depth
            item.object3D.position.z = zPos + containerHeight * 0.01;

            const xScale = isStretchAlignment && isColumnDirection
            ? containerWidth / itemBboxSize.x / numberOfWraps
            : containerWidthPerItem / itemBboxSize.x;
            
            const yScale = isStretchAlignment && !isColumnDirection 
            ? containerHeight / itemBboxSize.y / numberOfWraps
            : containerHeightPerItem / itemBboxSize.y;
            
            this.setItemScale(
                item, 
                new THREE.Vector3(
                    xScale,
                    yScale,
                    item.object3D.scale.z
                )
            );

            if (this.isItemWrap(item, isColumnDirection)) {
                const containerDimensionPerItem = isColumnDirection ? containerWidthPerItem : containerHeightPerItem;
                // An opposite dimension must be used to calculate the number of empty cells.
                // Here, `containerDimension` serves this purpose
                let containerDimension = containerWidth, containerDimensionWhenStretch = containerHeight;

                if (isColumnDirection) {
                    containerDimension = containerHeight;
                    containerDimensionWhenStretch = containerWidth;
                }

                const numberOfOccupiedCellsPerLine = this.items.length - itemIndex;
                const numberOfEmptyCellsPerLine = Math.max(Math.floor(containerDimension) - numberOfOccupiedCellsPerLine, 0);            
                const colIndexFromAlignment = {
                    "center": numberOfEmptyCellsPerLine / 2,
                    "end": numberOfEmptyCellsPerLine,
                    "space-around": numberOfEmptyCellsPerLine / 2
                };
                // 0 - for start and space-between
                colIndex = colIndexFromAlignment[this.data.mainAlign] ?? 0;

                const rowOffset = isStretchAlignment ? containerDimensionWhenStretch / numberOfWraps : containerDimensionPerItem;
                rowIndex += rowOffset;

                if (isColumnDirection) {
                    item.object3D.position.x = xPos + rowIndex + secondaryAlignOffset; 
                    item.object3D.position.y = yPos - colIndex * mainAlignOffset;
                } else {
                    item.object3D.position.x = xPos + colIndex * mainAlignOffset;
                    item.object3D.position.y = yPos - rowIndex - secondaryAlignOffset;
                }
            }

            colIndex++;
        }
    },

    /**
     * Sets the scale of the flexbox item based on the provided scale.
     * It also takes into account the component's normalized gap.
     * @param {AFRAME.AEntity} item
     * @param {AFRAME.THREE.Vector3} scale
     */
    setItemScale(item, scale) {
        item.object3D.scale.x = scale.x - (scale.x * this.normalizedGap.x);
        item.object3D.scale.y = scale.y - (scale.y * this.normalizedGap.y);
        item.object3D.scale.z = scale.z;

        // Multiply new item's scale by container's scale in cases where the container has a modified scale
        // This ensures the item fits within the container's scale, whether reduced or increased
        item.object3D.scale.multiply(this.el.object3D.scale);
    },

    /**
     * Calculates the width and height of one item inside the flexbox (container).
     * @param {boolean} isColumnDirection - flag that indicates if flexbox is in column direction.
     * @returns {number[]} array, where the first element is container's width per item 
     * and the second is container's height per item.
     */
    getContainerWidthAndHeightPerItem(isColumnDirection = false) {
        let itemWidth = this.container.width / this.items.length;
        let itemHeight = this.container.height / this.items.length;

        const isWrapSet = this.data.wrap;
        const containerDimension = isColumnDirection ? this.container.height : this.container.width;
        const itemsExceedContainerDimension = this.items.length > containerDimension;
        
        if (isWrapSet && itemsExceedContainerDimension) {
            const containerDimensionWholeNumber = Math.trunc(containerDimension);
            const containerDimensionFraction = containerDimensionWholeNumber > 0 ? (containerDimension % 1) / containerDimensionWholeNumber : 0;
            const numberOfWraps = this.getNumberOfWraps(isColumnDirection);

            itemWidth = Math.min(containerDimension, 1 + containerDimensionFraction);
            itemHeight = this.container.height / numberOfWraps;

            if (isColumnDirection) {
                // `itemWidth` is calculated relative to height (since `containerDimension` contains height in column direction)
                // So it's necessary to swap the item's dimensions
                itemHeight = itemWidth;
                itemWidth = this.container.width / numberOfWraps;
            }
        }

        return [itemWidth, itemHeight];
    },

    /**
     * Calculates alignment offsets for a single flexbox item. 
     * Should be multiplied by some value, e.g. row and column indexes. 
     * @param {boolean} isColumnDirection - flag that indicates if flexbox is in column direction.
     * @returns {number[]} array containing the horizontal and vertical alignment offsets.
     */
    getAlignmentOffsets(isColumnDirection = false) {
        const mainAlignData = this.data.mainAlign;
        const secondaryAlignData = this.data.secondaryAlign;
        const [containerWidthPerItem, containerHeightPerItem] = this.getContainerWidthAndHeightPerItem(isColumnDirection);

        const wrapOffset = this.getNumberOfWraps(isColumnDirection);

        let mainAlignContainerDimension = this.container.width, secondaryAlignContainerDimension = this.container.height;
        let mainAlignContainerDimensionPerItem = containerWidthPerItem, secondaryAlignContainerDimensionPerItem = containerHeightPerItem;
        let mainAlignGap = this.normalizedGap.x, secondaryAlignGap = this.normalizedGap.y;

        if (isColumnDirection) {
            mainAlignContainerDimension = this.container.height;
            mainAlignContainerDimensionPerItem = containerHeightPerItem;
            mainAlignGap = this.normalizedGap.y;

            secondaryAlignContainerDimension = this.container.width;
            secondaryAlignContainerDimensionPerItem = containerWidthPerItem;
            secondaryAlignGap = this.normalizedGap.x;
        }

        const alignmentValues = {
            mainAlign: {
                "start": mainAlignContainerDimensionPerItem,
                "center": mainAlignContainerDimensionPerItem,
                "end": mainAlignContainerDimensionPerItem,
                "space-around": mainAlignContainerDimensionPerItem,
                "space-between": mainAlignContainerDimensionPerItem + (mainAlignContainerDimensionPerItem * mainAlignGap) 
                / Math.max(((mainAlignContainerDimension / mainAlignContainerDimensionPerItem) - 1), 1)
            },
            secondaryAlign: {
                "start": 0,
                "center": secondaryAlignContainerDimension / 2 - secondaryAlignContainerDimensionPerItem / 2 * wrapOffset,
                "end": secondaryAlignContainerDimension - secondaryAlignContainerDimensionPerItem * wrapOffset,
                "stretch": secondaryAlignContainerDimension / 2 - secondaryAlignContainerDimensionPerItem / 2 
                - (secondaryAlignContainerDimension / 2 / wrapOffset) * (wrapOffset - 1) - (secondaryAlignContainerDimension / 2 / wrapOffset) * secondaryAlignGap
            }
        }; 

        const mainAlignOffset = alignmentValues.mainAlign[mainAlignData] ?? alignmentValues.mainAlign["start"];
        const secondaryAlignOffset = alignmentValues.secondaryAlign[secondaryAlignData] ?? alignmentValues.secondaryAlign["start"];
        
        return [mainAlignOffset, secondaryAlignOffset];
    },

    /**
     * Calculates offsets to move the item's origin from default focal point 
     * based on container's width and height per item, gap, direction and alignment values.
     * @param {boolean} isColumnDirection - flag that indicates if flexbox is in column direction.
     * @returns {number[]} array containing offsets for moving item origin.
     */
    getItemOriginOffsets(isColumnDirection = false) {
        const [containerWidthPerItem, containerHeightPerItem] = this.getContainerWidthAndHeightPerItem(isColumnDirection);
        const mainAlignData = this.data.mainAlign;
        const secondaryAlignData = this.data.secondaryAlign;
        const gap = this.normalizedGap;

        const alignmentValues = {
            mainAlign: {
                "start": isColumnDirection 
                ? containerHeightPerItem / 2 * gap.y 
                : -containerWidthPerItem / 2 * gap.x,
                "center": 0,
                "end": isColumnDirection 
                ? -containerHeightPerItem / 2 * gap.y 
                : containerWidthPerItem / 2 * gap.x,
                "space-around": 0,
                "space-between": isColumnDirection 
                ? containerHeightPerItem / 2 * gap.y 
                : -containerWidthPerItem / 2 * gap.x
            },
            secondaryAlign: {
                "start": isColumnDirection 
                ? -containerWidthPerItem / 2 * gap.x 
                : containerHeightPerItem / 2 * gap.y,
                "center": 0,
                "end": isColumnDirection 
                ? containerWidthPerItem / 2 * gap.x 
                : -containerHeightPerItem / 2 * gap.y,
                "stretch": 0
            }
        };

        const xOffsetFromOrigin = alignmentValues.mainAlign[mainAlignData] ?? 0;
        const yOffsetFromOrigin = alignmentValues.secondaryAlign[secondaryAlignData] ?? 0;
        const offsets = isColumnDirection ? [yOffsetFromOrigin, xOffsetFromOrigin] : [xOffsetFromOrigin, yOffsetFromOrigin];

        return offsets;
    },

    /**
     * Calculates the number of rows or columns depending on flexbox direction.
     * If flexbox wrap is not set, returns 1.
     * @param {boolean} isColumnDirection - flag that indicates if flexbox is in column direction. 
     * Default value is false.
     * @returns {number} number of wraps (rows or columns).
     */
    getNumberOfWraps(isColumnDirection = false) {
        let numberOfWraps = 1;
        if (!this.data.wrap) return numberOfWraps

        const containerDimension = isColumnDirection ? this.container.height : this.container.width;

        if (containerDimension < 2) {
            // Every item is a row/column
            numberOfWraps = this.items.length;
        } else {
            // Calculating the number of rows/columns
            numberOfWraps = Math.ceil(this.items.length / Math.floor(containerDimension));   
        }

        return numberOfWraps;
    },

    /**
     * 
     * @param {AFRAME.AEntity} item 
     * @param {boolean} isColumnDirection - flag that indicates if flexbox is in column direction.
     * @returns {boolean} boolean, indicating whether or not the item should be wrapped to a new row or column.
     */
    isItemWrap(item, isColumnDirection = false) {
        if (!this.data.wrap) return false

        if (isColumnDirection) {
            const positionYLimit = -this.container.height / 2;

            return item.object3D.position.y < positionYLimit;
        } else {
            const positionXLimit = this.container.width / 2;

            return item.object3D.position.x > positionXLimit;
        }
    }
});