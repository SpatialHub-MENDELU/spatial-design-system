import * as AFRAME from "aframe";

AFRAME.registerComponent("flexbox", {
    schema: {
        hAlign: { type: "string", default: "start" },
        vAlign: { type: "string", default: "stretch" },
        direction: { type: "string", default: "row" },
        wrap: { type: "boolean", default: false },
        padding: { type: "vec2", default: { x: 0, y: 0 } },
        gap: { type: "number", default: 0 }
    },

    init() {
        this.el.addEventListener("loaded", () => {
            this.items = Array.from(this.el.children);
            if (this.items.length === 0) return 

            const geometry = this.el.getObject3D("mesh").geometry;

            this.container = {
                width: geometry.parameters.width,
                height: geometry.parameters.height,
                depth: geometry.parameters.depth
            };
            this.data.gap = this.data.wrap && this.data.gap > 0 ? this.data.gap : 0;

            this.setPadding(this.data.padding.x, this.data.padding.y);
            this.setItemsPosition();
        });
    },

    /**
     * Sets the padding that is used for item scaling and positioning, normalizing values between 0 and 1.
     * @param {number} x - The horizontal padding percentage between 0 and 100 (excluded).
     * @param {number} y - The vertical padding percentage between 0 and 100 (excluded).
     */
    setPadding(x, y) {
        const isColumnDirection = this.data.direction === "column";
        const isJustifiedSpace = this.data.hAlign === "space-around" || this.data.hAlign === "space-between";

        let paddingX = x > 0 && x < 100 ? x / 100 : 0;
        let paddingY = y > 0 && y < 100 ? y / 100 : 0;

        if (isJustifiedSpace) {
            const [containerWidthPerItem, containerHeightPerItem] = this.getContainerWidthAndHeightPerItem(isColumnDirection);                    
            
            const numberOfWraps = this.getNumberOfWraps(isColumnDirection);
            const itemsOffset = Math.ceil((this.items.length / numberOfWraps)) - 1; 
            
            if (isColumnDirection) {
                paddingY = (containerHeightPerItem * 0.5 / this.container.height) * itemsOffset;
            } else {
                paddingX = (containerWidthPerItem * 0.5 / this.container.width) * itemsOffset;
            }
        }

        this.normalizedPadding = { x: paddingX, y: paddingY };
    },

    /**
     * Sets the overall layout of the items inside the flexbox.
     */
    setItemsPosition() {
        const isColumnDirection = this.data.direction === "column";
        const isStretchAlignment = this.data.vAlign === "stretch";

        const containerWidth = this.container.width;
        const containerHeight = this.container.height;
        // If it's 3D shape, take its depth; otherwise, set it to zero for 2D shapes
        const containerDepth = this.container.depth || 0;
        const [containerWidthPerItem, containerHeightPerItem] = this.getContainerWidthAndHeightPerItem(isColumnDirection);

        const [xOffsetFromOrigin, yOffsetFromOrigin] = this.getItemOriginOffsets(isColumnDirection);
        const [hAlignOffset, vAlignOffset] = this.getAlignmentOffsets(isColumnDirection);
        const gapOffset = this.data.gap;

        const numberOfWraps = this.getNumberOfWraps(isColumnDirection);

        let rowIndex = 0, colIndex = 0;

        for (let itemIndex = 0; itemIndex < this.items.length; itemIndex++) {
            const item = this.items[itemIndex];
            const itemBbox = new THREE.Box3().setFromObject(item.object3D);
            const itemBboxSize = itemBbox.getSize(new THREE.Vector3());

            const xPos = (-containerWidth / 2) + containerWidthPerItem / 2 + xOffsetFromOrigin;
            const yPos = containerHeight / 2 - containerHeightPerItem / 2 + yOffsetFromOrigin;
            const zPos = containerDepth / 2 + itemBboxSize.z / 2;

            const xOffset = colIndex * hAlignOffset;
            const yOffset = rowIndex + vAlignOffset;

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
                colIndex = colIndexFromAlignment[this.data.hAlign] ?? 0;

                const rowOffset = isStretchAlignment ? containerDimensionWhenStretch / numberOfWraps : containerDimensionPerItem;
                rowIndex += rowOffset + gapOffset;

                if (isColumnDirection) {
                    item.object3D.position.x = xPos + rowIndex + vAlignOffset; 
                    item.object3D.position.y = yPos - colIndex * hAlignOffset;
                } else {
                    item.object3D.position.x = xPos + colIndex * hAlignOffset;
                    item.object3D.position.y = yPos - rowIndex - vAlignOffset;
                }
            }

            colIndex++;
        }
    },

    /**
     * Sets the scale of the flexbox item.
     * @param {Object} item
     * @param {Object} scale
     * @param {number} scale.x
     * @param {number} scale.y
     * @param {number} scale.z
     */
    setItemScale(item, scale) {
        item.object3D.scale.x = scale.x - (scale.x * this.normalizedPadding.x);
        item.object3D.scale.y = scale.y - (scale.y * this.normalizedPadding.y);
        item.object3D.scale.z = scale.z;
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
        const hAlignData = this.data.hAlign;
        const vAlignData = this.data.vAlign;
        const [containerWidthPerItem, containerHeightPerItem] = this.getContainerWidthAndHeightPerItem(isColumnDirection);

        const gapOffset = this.data.gap;
        const wrapOffset = this.getNumberOfWraps(isColumnDirection);

        let hAlignContainerDimension = this.container.width, vAlignContainerDimension = this.container.height;
        let hAlignContainerDimensionPerItem = containerWidthPerItem, vAlignContainerDimensionPerItem = containerHeightPerItem;
        let hAlignPadding = this.normalizedPadding.x, vAlignPadding = this.normalizedPadding.y;

        if (isColumnDirection) {
            hAlignContainerDimension = this.container.height;
            hAlignContainerDimensionPerItem = containerHeightPerItem;
            hAlignPadding = this.normalizedPadding.y;

            vAlignContainerDimension = this.container.width;
            vAlignContainerDimensionPerItem = containerWidthPerItem;
            vAlignPadding = this.normalizedPadding.x;
        }

        const alignmentValues = {
            hAlign: {
                "start": hAlignContainerDimensionPerItem,
                "center": hAlignContainerDimensionPerItem,
                "end": hAlignContainerDimensionPerItem,
                "space-around": hAlignContainerDimensionPerItem,
                "space-between": hAlignContainerDimensionPerItem + (hAlignContainerDimensionPerItem * hAlignPadding) 
                / Math.max(((hAlignContainerDimension / hAlignContainerDimensionPerItem) - 1), 1)
            },
            vAlign: {
                "start": 0,
                "center": vAlignContainerDimension / 2 - vAlignContainerDimensionPerItem / 2 * wrapOffset - (gapOffset / 2 * (wrapOffset - 1)),
                "end": vAlignContainerDimension - vAlignContainerDimensionPerItem * wrapOffset - (gapOffset * (wrapOffset - 1)),
                "stretch": vAlignContainerDimension / 2 - vAlignContainerDimensionPerItem / 2 
                - (vAlignContainerDimension / 2 / wrapOffset) * (wrapOffset - 1) - (vAlignContainerDimension / 2 / wrapOffset) * vAlignPadding
            }
        }; 

        const hAlignOffset = alignmentValues.hAlign[hAlignData] ?? alignmentValues.hAlign["start"];
        const vAlignOffset = alignmentValues.vAlign[vAlignData] ?? alignmentValues.vAlign["start"];

        return [hAlignOffset, vAlignOffset];
    },

    /**
     * Calculates offsets to move the item's origin from default focal point 
     * based on container's width and height per item, padding, direction and alignment values.
     * @param {boolean} isColumnDirection - flag that indicates if flexbox is in column direction.
     * @returns {number[]} array containing offsets for moving item origin.
     */
    getItemOriginOffsets(isColumnDirection = false) {
        const [containerWidthPerItem, containerHeightPerItem] = this.getContainerWidthAndHeightPerItem(isColumnDirection);
        const hAlignData = this.data.hAlign;
        const vAlignData = this.data.vAlign;
        const padding = this.normalizedPadding;

        const alignmentValues = {
            hAlign: {
                "start": isColumnDirection 
                ? containerHeightPerItem / 2 * padding.y 
                : -containerWidthPerItem / 2 * padding.x,
                "center": 0,
                "end": isColumnDirection 
                ? -containerHeightPerItem / 2 * padding.y 
                : containerWidthPerItem / 2 * padding.x,
                "space-around": 0,
                "space-between": isColumnDirection 
                ? containerHeightPerItem / 2 * padding.y 
                : -containerWidthPerItem / 2 * padding.x
            },
            vAlign: {
                "start": isColumnDirection 
                ? -containerWidthPerItem / 2 * padding.x 
                : containerHeightPerItem / 2 * padding.y,
                "center": 0,
                "end": isColumnDirection 
                ? containerWidthPerItem / 2 * padding.x 
                : -containerHeightPerItem / 2 * padding.y,
                "stretch": 0
            }
        };

        const xOffsetFromOrigin = alignmentValues.hAlign[hAlignData] ?? 0;
        const yOffsetFromOrigin = alignmentValues.vAlign[vAlignData] ?? 0;
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
     * @param {Object} item 
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