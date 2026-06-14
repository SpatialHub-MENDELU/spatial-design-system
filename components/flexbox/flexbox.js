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
        justify: { default: JUSTIFY.START  },    // start | end | center | between | around
        items: { default: ITEMS.START },        // start | end | center
        wrap: { default: false },
        gap: { type: "vec2", default: { x: 0, y: 0 } }
    },
    container: {
        width: 0,
        height: 0,
        depth: 0
    },
    items: [], // Array of children items of container
    lines: [], // Array of lines, each line is an array of items which fit in one "line" in flexbox direction.
    // x | y
    MAIN_AXIS: "",
    // y | x
    CROSS_AXIS: "",
    // width | height
    MAIN_DIMENSION: "",
    // height | width
    CROSS_DIMENSION: "",

    pendingUpdate: false,

    init() {
        this.handleSceneLoaded = this.handleSceneLoaded.bind(this);
        this.handleChildrenChanges = this.handleChildrenChanges.bind(this);
        this.setupObservers = this.setupObservers.bind(this);
        this.updateLayout = this.updateLayout.bind(this);

        // Initialize lines array to prevent undefined errors
        this.lines = [[]];

        // Setup a timeout to debounce rapid updates
        this.updateTimeout = null;

        onSceneLoaded(this.el.sceneEl, this.handleSceneLoaded);

        // Listen for changes to this element
        this.el.addEventListener('componentchanged', this.updateLayout);

        // Listen for child-attached events
        this.el.addEventListener('child-attached', this.handleChildrenChanges);
        this.el.addEventListener('child-detached', this.handleChildrenChanges);

        // Listen for model loading
        this.el.addEventListener('model-loaded', this.updateLayout);
    },

    handleChildrenChanges(event) {
        // Debounce the update to avoid multiple rapid recalculations
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.updateLayout();
        }, 50);
    },

    setupObservers() {
        // Create a new MutationObserver to watch for attribute changes
        this.observer = new MutationObserver((mutations) => {
            let needsUpdate = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    const attr = mutation.attributeName;
                    if (attr === 'position' || attr === 'rotation' || attr === 'scale' ||
                        attr === 'width' || attr === 'height' || attr === 'depth') {
                        needsUpdate = true;
                    }
                }
            });

            if (needsUpdate) {
                this.updateLayout();
            }
        });

        // ONLY observe the container element (this.el), NOT its children
        this.observer.observe(this.el, {
            attributes: true,
            attributeFilter: ['position', 'rotation', 'scale', 'width', 'height', 'depth']
        });

        // Setup a separate observer for child additions/removals
        this.childrenObserver = new MutationObserver((mutations) => {
            let childrenChanged = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' &&
                    (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    childrenChanged = true;
                }
            });

            if (childrenChanged) {
                this.updateLayout();
            }
        });

        // Observe only child additions/removals, not attribute changes
        this.childrenObserver.observe(this.el, {
            childList: true
        });
    },

    updateLayout() {
        // Prevent multiple simultaneous updates
        if (this.pendingUpdate) {
            return;
        }

        this.pendingUpdate = true;

        // Use requestAnimationFrame to ensure DOM updates have completed
        requestAnimationFrame(() => {
            if (this.validateContainer()) {
                this.initializeContainer();
                this.handleModels();
            }
            this.pendingUpdate = false;
        });
    },

    handleSceneLoaded() {
        this.updateLayout();
        this.setupObservers();
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
        this.items = Array.from(this.el.children);

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
        // Initialize/reset the lines array
        this.lines = [[]];
        this.colBasedLayout = false;

        this.preCalculateColumnSizes();

        if(this.isDirectionRow()){
            if(this.data.wrap) {
                this.setRowItemsLayoutWrap();
            } else {
                this.setRowItemsLayout();
            }
        } else{
            if(this.data.wrap) {
                this.setColItemsLayoutWrap();
            } else {
                this.setColItemsLayout();
            }
        }

        // flexbox lifecycle
        this.applyBootstrapGrid();
        this.applyGrow()
        this.applyJustifyContent()
        this.applyAlignItems()

        this.updateNestedFlexboxes();
    },

    preCalculateColumnSizes() {
        // Store original sizes for later reference
        this.originalSizes = new Map();
        this.calculatedSizes = new Map();

        const colItems = this.items.filter(item => item.getAttribute("flex-col") !== null);
        const growItems = this.items.filter(item => this.hasFlexGrow(item));

        if (!colItems.length && !growItems.length) return;

        const columnSize = this.container[this.MAIN_DIMENSION] / 12;

        colItems.forEach(colItem => {
            if (!colItem.components || !colItem.components['flex-col']) return;

            const originalSize = this.getItemBboxSize(colItem);
            this.originalSizes.set(colItem, { x: originalSize.x, y: originalSize.y, z: originalSize.z });

            const colValue = colItem.components['flex-col'].getCurrentColumn();
            if (!colValue) return;

            const newDimensionSize = columnSize * +colValue;

            const calculatedSize = { x: originalSize.x, y: originalSize.y, z: originalSize.z };
            calculatedSize[this.MAIN_AXIS] = newDimensionSize;
            this.calculatedSizes.set(colItem, calculatedSize);
        });

        // flex-grow items get a basis of 0 on the main axis so wrap packs them onto
        // whatever line still has room; applyGrow then expands them into the leftover space.
        growItems.forEach(growItem => {
            let base;
            if (this.calculatedSizes.has(growItem)) {
                base = { ...this.calculatedSizes.get(growItem) };
            } else {
                const originalSize = this.getItemBboxSize(growItem);
                base = { x: originalSize.x, y: originalSize.y, z: originalSize.z };
                if (!this.originalSizes.has(growItem)) {
                    this.originalSizes.set(growItem, { ...base });
                }
            }
            base[this.MAIN_AXIS] = 0;
            this.calculatedSizes.set(growItem, base);
        });
    },

    hasFlexGrow(item) {
        const v = item.getAttribute("flex-grow");
        return v !== null && v !== "false";
    },

    getItemColSpan(item) {
        if (item.getAttribute("flex-col") !== null && item.components && item.components['flex-col']) {
            const v = item.components['flex-col'].getCurrentColumn();
            if (v) return +v;
        }
        // Fallback: derive cols from physical width so the item still participates in the grid
        const colUnit = this.container[this.MAIN_DIMENSION] / 12;
        if (colUnit <= 0) return 0;
        const size = this.getItemBboxSize(item)[this.MAIN_AXIS];
        return Math.min(12, size / colUnit);
    },

    setRowItemsLayoutWrapColBased() {
        // 12-column grid wrap: an item joins the current row while col-sum ≤ 12,
        // and flex-grow items expand to fill any remaining cols on their row.
        const COL_CAPACITY = 12;
        const lines = [[]];
        let currentLine = lines[0];
        let currentColSum = 0;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const cols = this.getItemColSpan(item);
            if (currentColSum + cols > COL_CAPACITY + 1e-6 && currentLine.length > 0) {
                currentLine = [];
                lines.push(currentLine);
                currentColSum = 0;
            }
            currentLine.push(item);
            currentColSum += cols;
        }

        // Distribute leftover cols on each row equally to that row's flex-grow items
        const growExtraCols = new Map();
        lines.forEach(line => {
            const lineColSum = line.reduce((s, it) => s + this.getItemColSpan(it), 0);
            const slack = COL_CAPACITY - lineColSum;
            if (slack <= 0) return;
            const growItems = line.filter(it => this.hasFlexGrow(it));
            if (!growItems.length) return;
            const extra = slack / growItems.length;
            growItems.forEach(it => growExtraCols.set(it, extra));
        });

        // Lay out each row physically. col_unit is always container.width / 12 so a
        // "6 col" item is always half the container, regardless of gap — gap is layered
        // on top of cols, and rows can overflow if the author picks a too-large gap.
        const colUnit = this.container.width / COL_CAPACITY;
        let currentY = this.container.height / 2;

        lines.forEach((line, lineIdx) => {
            let currentX = -this.container.width / 2;
            let lineHeight = 0;

            line.forEach(item => {
                const cols = this.getItemColSpan(item) + (growExtraCols.get(item) || 0);
                const physicalWidth = cols * colUnit;
                const itemBbox = this.getItemBboxSize(item);
                const itemHeight = itemBbox.y;
                const itemDepth = itemBbox.z;

                item.setAttribute(this.MAIN_DIMENSION, physicalWidth);

                const cs = this.calculatedSizes.get(item) || { x: physicalWidth, y: itemHeight, z: itemDepth };
                cs.x = physicalWidth;
                cs.y = itemHeight;
                cs.z = itemDepth;
                this.calculatedSizes.set(item, cs);

                currentX += physicalWidth / 2;
                item.object3D.position.set(
                    currentX,
                    currentY - itemHeight / 2,
                    this.container.depth / 2 + itemDepth / 2 + this.container.height * 0.01
                );
                // No gap.x between items: the 12-col grid is the spacing unit, so cols
                // are placed edge-to-edge. gap.y still separates rows.
                currentX += physicalWidth / 2;
                lineHeight = Math.max(lineHeight, itemHeight);
            });

            if (lineIdx < lines.length - 1) {
                currentY -= lineHeight + this.data.gap.y;
            }
        });

        this.lines = lines;
        this.colBasedLayout = true;
    },

    updateNestedFlexboxes() {
        // Find any child elements that have flexbox component
        Array.from(this.el.children).forEach(child => {
            const flexboxComponent = child.components && child.components.flexbox;
            if (flexboxComponent) {
                // Schedule update for next frame to ensure parent is done
                requestAnimationFrame(() => {
                    flexboxComponent.updateLayout();
                });
            }
        });
    },

    setRowItemsLayout() {
        const lines = [[]]; // Initialize lines array
        let currentX = -this.container.width / 2;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemBboxSize = this.getItemBboxSize(item);

            currentX += itemBboxSize.x / 2; // Start position + half of the item's width
            item.object3D.position.set(
                currentX,
                this.container.height / 2 - itemBboxSize.y / 2,
                this.container.depth / 2 + itemBboxSize.z / 2 + this.container.height * 0.01 // Keep the z-offset for consistency
            );
            currentX += (itemBboxSize.x / 2) + this.data.gap.x; // Move currentX for the next item + gap
            lines[0].push(item);
        }

        this.lines = lines;
    },

    setColItemsLayout() {
        const lines = [[]]; // Initialize lines array
        let currentY = this.container.height / 2; // Start at the top

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemBboxSize = this.getItemBboxSize(item);

            currentY -= itemBboxSize.y / 2;
            item.object3D.position.set(
                -this.container.width / 2 + itemBboxSize.x / 2, // x-position: left-aligned
                currentY,
                this.container.depth / 2 + itemBboxSize.z / 2 + this.container.height * 0.01
            );
            currentY -= (itemBboxSize.y / 2) + this.data.gap.y;
            lines[0].push(item);
        }

        this.lines = lines;
    },

    setRowItemsLayoutWrap() {
        // Switch to the 12-column grid path when any flex-grow item is present —
        // flex-grow's "fill leftover cols up to 12" semantics only make sense in col-space.
        if (this.items.some(item => this.hasFlexGrow(item))) {
            this.setRowItemsLayoutWrapColBased();
            return;
        }

        const lines = [[]]; // Initialize lines array
        let currentLine = lines[0];
        let currentX = -this.container.width / 2;
        let currentY = this.container.height / 2;
        let currentLineHeight = 0;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemBboxSize = this.getItemBboxSize(item);

            currentX += itemBboxSize.x / 2;

            const itemDoesNotFit = currentX + itemBboxSize.x / 2 > this.container.width / 2 + 1e-6;
            if (itemDoesNotFit) {
                // Move to the next line
                currentX = -this.container.width / 2 + itemBboxSize.x / 2;
                currentY -= currentLineHeight + this.data.gap.y;
                currentLineHeight = 0; // Reset line height for the new line
                currentLine = []; // Start a new line
                lines.push(currentLine);
            }

            item.object3D.position.set(
                currentX,
                currentY - itemBboxSize.y / 2,
                this.container.depth / 2 + itemBboxSize.z / 2 + this.container.height * 0.01
            );

            currentX += itemBboxSize.x / 2 + this.data.gap.x;
            currentLineHeight = Math.max(currentLineHeight, itemBboxSize.y); // Update line height
            currentLine.push(item); // Add item to the current line
        }

        this.lines = lines;
    },

    setColItemsLayoutWrap() {
        const lines = [[]]; // Initialize lines array
        let currentLine = lines[0];
        let currentX = -this.container.width / 2;
        let currentY = this.container.height / 2;
        let currentLineWidth = 0;

        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const itemBboxSize = this.getItemBboxSize(item);

            currentY -= itemBboxSize.y / 2;

            const doesItemNotFit = currentY - itemBboxSize.y / 2 < -this.container.height / 2 - 1e-6;
            if (doesItemNotFit) {
                // Move to the next column
                currentY = this.container.height / 2 - itemBboxSize.y / 2;
                currentX += currentLineWidth + this.data.gap.x;
                currentLineWidth = 0; // Reset line width for the new column
                currentLine = []; // Start a new column
                lines.push(currentLine);
            }

            item.object3D.position.set(
                currentX + itemBboxSize.x / 2,
                currentY,
                this.container.depth / 2 + itemBboxSize.z / 2 + this.container.height * 0.01
            );

            currentY -= itemBboxSize.y / 2 + this.data.gap.y;
            currentLineWidth = Math.max(currentLineWidth, itemBboxSize.x); // Update column width
            currentLine.push(item); // Add item to the current column
        }

        this.lines = lines;
    },

    applyGrow() {
        if (this.colBasedLayout) return; // Grow already distributed in column space
        if (!this.lines || !this.lines.length) return;

        this.lines.forEach(line => {
            if (!line || !line.length) return;

            let freeSpace = this.container[this.MAIN_DIMENSION] - this.data.gap[this.MAIN_AXIS] * (line.length - 1);

            line.forEach(item => {
                const itemBboxSize = this.getItemBboxSize(item);
                freeSpace -= itemBboxSize[this.MAIN_AXIS];
            });

            const growItems = line.filter(item => (
                item.getAttribute("flex-grow") !== null
                && item.getAttribute("flex-grow") !== "false"
            ));

            if (!growItems.length) return;

            const freeSpacePerItem = freeSpace / growItems.length;

            const ORIGINAL_DIRECTION_ATTRIBUTE = `original-${this.MAIN_DIMENSION}`;

            growItems.forEach(growItem => {
                if(!growItem.hasAttribute(ORIGINAL_DIRECTION_ATTRIBUTE)) {
                    growItem.setAttribute(ORIGINAL_DIRECTION_ATTRIBUTE, growItem.getAttribute(this.MAIN_DIMENSION) || '1');
                }

                // Grow from the current (post-bootstrap) size, not the original attribute —
                // otherwise a flex-col item that was just enlarged by applyBootstrapGrid
                // would be shrunk back to its pre-col base + grow share. For items with
                // flex-grow this base is 0 (set in preCalculateColumnSizes), so the new
                // size is simply the leftover-space share.
                const baseSize = this.getItemBboxSize(growItem)[this.MAIN_AXIS];
                const newSize = baseSize + freeSpacePerItem;
                growItem.setAttribute(this.MAIN_DIMENSION, newSize);

                // Keep calculatedSizes in sync so later passes (justify, align) see the
                // post-grow size instead of the 0 basis.
                if (this.calculatedSizes && this.calculatedSizes.has(growItem)) {
                    this.calculatedSizes.get(growItem)[this.MAIN_AXIS] = newSize;
                }

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
            });
        });
    },

    applyBootstrapGrid() {
        if (this.colBasedLayout) return; // Column sizing already applied in setRowItemsLayoutWrapColBased
        if (!this.lines || !this.lines.length) return;

        this.lines.forEach(line => {
            if (!line || !line.length) return;

            const colItems = line.filter(item => (
                item.getAttribute("flex-col") !== null
            ));

            if (!colItems.length) return;

            const ORIGINAL_DIRECTION_ATTRIBUTE = `original-${this.MAIN_DIMENSION}`;
            const columnSize = this.container[this.MAIN_DIMENSION] / 12;

            colItems.forEach(colItem => {
                if (!colItem.components || !colItem.components['flex-col']) return;
                // flex-grow takes precedence over flex-col sizing — applyGrow assigns
                // these items the leftover space on their line.
                if (this.hasFlexGrow(colItem)) return;

                const originalDimensionSize = colItem.getAttribute(this.MAIN_DIMENSION) || '1';
                const colValue = colItem.components['flex-col'].getCurrentColumn();

                if (!colValue) return;

                const newDimensionSize = columnSize * +colValue;

                if(!colItem.hasAttribute(ORIGINAL_DIRECTION_ATTRIBUTE)) {
                    colItem.setAttribute(ORIGINAL_DIRECTION_ATTRIBUTE, originalDimensionSize);
                }

                colItem.setAttribute(this.MAIN_DIMENSION, newDimensionSize);

                // No position adjustment needed: setRowItemsLayoutWrap / setRowItemsLayout
                // (and the col equivalents) already laid the line out using the calculated
                // column sizes via getItemBboxSize → calculatedSizes. Shifting again here
                // would double-apply the size delta and cause items to overlap.
            });
        });
    },

    handleColumnBreakpoint() {
        this.el.addEventListener('breakpoint-changed', () => {
            this.initializeContainer();
            this.setItemsLayout();
        });
    },

    applyJustifyContent() {
        if (!this.lines || !this.lines.length) return;

        this.lines.forEach(line => {
            if (!line || !line.length) return;

            const freeSpace = this.getFreeSpaceForLineJustify(line);
            if (freeSpace <= 0) return;

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
                    if (line.length > 1) {
                        this.distributeSpaceBetween(line, freeSpace);
                    }
                    break;
                case JUSTIFY.AROUND:
                    if (line.length > 0) {
                        this.distributeSpaceAround(line, freeSpace);
                    }
                    break;
            }
        });
    },

    // Helper functions for justify-content
    getFreeSpaceForLineJustify(line) {
        if (!line || !line.length) return 0;

        let usedSpace = this.data.gap[this.MAIN_AXIS] * (line.length - 1);
        line.forEach(item => {
            const size = this.getItemBboxSize(item);
            if (size) usedSpace += size[this.MAIN_AXIS];
        });

        return this.container[this.MAIN_DIMENSION] - usedSpace;
    },

    shiftJustifiedLine(line, freeSpace) {
        if (!line || !line.length) return;

        line.forEach(item => {
            if(this.isDirectionRow()) {
                item.object3D.position.x += freeSpace;
            } else {
                item.object3D.position.y -= freeSpace;
            }
        });
    },

    distributeSpaceBetween(line, freeSpace) {
        if (!line || line.length <= 1) return;

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
        if (!line || !line.length) return;

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
        if (!this.lines || !this.lines.length || !this.lines[0] || !this.lines[0].length) return;

        // Safety check has been added
        const freeSpace = this.getFreeSpaceForLineItems(this.lines[0]);

        this.lines.forEach((line) => {
            if (!line || !line.length) return;

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
                            item.object3D.position.x += (maxCrossSizeInLine - this.getItemBboxSize(item)[this.CROSS_AXIS]) / 2;
                        }
                    });
                    break;
                case ITEMS.END:
                    line.forEach(item => {
                        if(this.isDirectionRow()) {
                            item.object3D.position.y -= freeSpace;
                            item.object3D.position.y -= (maxCrossSizeInLine - this.getItemBboxSize(item)[this.CROSS_AXIS]);
                        } else {
                            item.object3D.position.x += freeSpace;
                            item.object3D.position.x += (maxCrossSizeInLine - this.getItemBboxSize(item)[this.CROSS_AXIS]);
                        }
                    });
                    break;
            }
        });
    },

    getFreeSpaceForLineItems(line) {
        if (!line || !Array.isArray(line) || line.length === 0) {
            return 0;
        }

        let usedSpace = 0;

        // Get maximum cross size for first line
        const maxCrossSizeInLine = this.getMaxLineSizeInAxis(line, this.CROSS_AXIS);
        usedSpace += maxCrossSizeInLine;

        // Add size of next lines including gaps
        const lineIndex = this.lines.indexOf(line);
        for(let i = 1; i < this.lines.length; i++) {
            if (this.lines[i] && this.lines[i].length > 0) {
                const maxCrossSizeInNextLine = this.getMaxLineSizeInAxis(this.lines[i], this.CROSS_AXIS);
                usedSpace += maxCrossSizeInNextLine;

                // Add gap if not the last line
                if (i < this.lines.length - 1) {
                    usedSpace += this.data.gap[this.CROSS_AXIS];
                }
            }
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
        // If we have a pre-calculated size for this item, use it
        if (this.calculatedSizes && this.calculatedSizes.has(item)) {
            return this.calculatedSizes.get(item);
        }

        // Otherwise use the original method
        const itemBbox = computeBbox(item);
        if (itemBbox.isEmpty()) {
            // Return default size if bbox is empty
            return new AFRAME.THREE.Vector3(0.1, 0.1, 0.1);
        }

        return itemBbox
            .getSize(new AFRAME.THREE.Vector3())
            .divide(this.el.object3D.scale);
    },

    getMaxLineSizeInAxis(line, axis) {
        if (!line || !line.length) return 0;

        const sizes = line.map(item => {
            const size = this.getItemBboxSize(item);
            return size ? size[axis] : 0;
        });

        return Math.max(...sizes);
    },

    /**
     * Calculates the total size of the content along the specified axis.
     *
     * @param {string} axis - The axis to calculate the content size for ('x' or 'y').
     * @returns {number} - The total size of the content along the specified axis.
     */
    getContentSize(axis) {
        if (!this.lines || !this.lines.length) return 0;

        return this.lines
                .map(line => {
                    if (!line || !line.length) return 0;

                    let lineSize = 0;

                    line.forEach(item => {
                        lineSize = Math.max(this.getItemBboxSize(item)[axis], lineSize);
                    });

                    return lineSize;
                })
                .reduce((acc, val) => acc + val, 0)
            // Add gaps
            + (this.data.gap[axis] * (this.lines.length - 1));
    },

    update(oldData) {
        // Only update if the component is fully initialized
        if (!this.el.sceneEl.hasLoaded) {
            return;
        }

        // Check if any relevant properties changed
        const relevantProps = ['direction', 'justify', 'items', 'wrap'];
        const hasRelevantChanges = relevantProps.some(prop => oldData[prop] !== undefined && oldData[prop] !== this.data[prop]);

        if (hasRelevantChanges ||
            (oldData.gap && (oldData.gap.x !== this.data.gap.x || oldData.gap.y !== this.data.gap.y))) {
            this.updateLayout();
        }
    },

    remove() {
        // Clean up event listeners
        this.el.removeEventListener('componentchanged', this.updateLayout);
        this.el.removeEventListener('child-attached', this.handleChildrenChanges);
        this.el.removeEventListener('child-detached', this.handleChildrenChanges);
        this.el.removeEventListener('model-loaded', this.updateLayout);

        // Clean up timeout
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        // Clean up MutationObserver
        if (this.observer) {
            this.observer.disconnect();
        }
    }
});