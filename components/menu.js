import * as AFRAME from "aframe"
import "aframe-troika-text"
import { PRIMARY_COLOR_DARK, VARIANT_LIGHT_COLOR, determineHighlightedColor } from "../utils/colors.js"
import { getContrast, setContrastColor, computeBbox } from "../utils/utils.js"
import arrowBackIcon from "../assets/arrow-back-white.png"

AFRAME.registerComponent("menu", {
    schema: { 
        size: { type: "string", default: "medium" },
        items: { type: "string", default: "" },
        itemsopacity: { type: "number", default: 1 },
        menuopacity: { type: "number", default: 1 },
        color: {type: "string", default: PRIMARY_COLOR_DARK},
        activecolor: {type: "string", default: ""},
        clickable: {type: "boolean", default: true},
        layout: { type: "string", default: "grid" },
        gridcolumns: { type: "number", default: 2 },
        logoicon: { type: "string", default: "" },
        backbutton: {type: 'boolean', default: false},
        showtext: {type: 'boolean', default: true},
        // basic    - a clicked item is highlighted only briefly
        // single   - a clicked item stays highlighted until clicked again,
        //            selecting another item unselects the previous one
        // multiple - like single, but any number of items can be selected
        selectionmode: {type: 'string', default: 'multiple', oneOf: ['basic', 'single', 'multiple']},
    },

    init() {
        this.selected = [];
        this.itemEls = [];
        this.flashTimeouts = new Map();
        this.flashDuration = 300
        this.animationDuration = 300
        this.hideTimeout = null

        this.originalScale = this.el.object3D.scale.clone()

        this.el.setAttribute("material", {color: this.data.color, opacity: this.data.menuopacity})
        this.setSize()

        this.el.classList.add("clickable")

        this.el.addEventListener("show", () => this.show())
        this.el.addEventListener("hide", () => this.hide())
        this.el.addEventListener("set-origin", (e) => this.setOrigin(e.detail))
        this.el.addEventListener("reset-selection", () => this.resetSelection())
        this.el.addEventListener("reset-original-scale", () => this.resetOriginalScale())

        this.prepareItems()
    },

    prepareItems() {
        let parsedItems = []
        const rawItems = this.data.items

        if (typeof rawItems === "string") {
            const normalizedItems = rawItems.replaceAll("'", "\"").trim()
            if (normalizedItems !== "") {
                try {
                    const items = JSON.parse(normalizedItems)
                    if (Array.isArray(items)) {
                        parsedItems = items
                    } else {
                        console.warn('[menu] "items" must be a JSON array string.', items)
                    }
                } catch (error) {
                    console.warn('[menu] Failed to parse "items" JSON.', rawItems, error)
                }
            }
        } else if (Array.isArray(rawItems)) {
            parsedItems = [...rawItems]
        } else if (rawItems !== null && rawItems !== undefined) {
            console.warn('[menu] "items" must be a JSON array string.', rawItems)
        }

        if (parsedItems.length < 2) {
            console.log("Minimum of 2 items required. Adding substitute items.")
            parsedItems.length === 0 ? parsedItems.push({icon: "", title: "substitute element"}, {icon: "", title: "substitute element"}) :
                parsedItems.push({icon: "", title: "substitute element"})
        }

        this.setItems(parsedItems)
    },

    setOrigin(origin) {
        if (origin.position) {
            this.el.object3D.position.copy(origin.position)
        }
        if (origin.rotation) {
            this.el.object3D.rotation.copy(origin.rotation)
        }
        if (origin.quaternion) {
            this.el.object3D.quaternion.copy(origin.quaternion)
        }
    },

    resetOriginalScale() {
        this.el.object3D.scale.copy(this.originalScale)
    },

    show() {
        this.el.classList.add("open")
        this.el.object3D.visible = true

        let targetScale = this.originalScale

        // if fit-into-fov or auto-scale components are mounted on the menu, use their scale
        if (this.el.components['fit-into-fov']) { // fit-into-fov has priority over auto-scale
            targetScale = this.el.components['fit-into-fov'].calculateNewScale()
        } else if (this.el.components['auto-scale'] && this.el.components['auto-scale'].data.enabled) {
            targetScale = this.el.components['auto-scale'].calculateNewScale()
        }

        // prevent menu from being too small
        if (targetScale.x < 0.001 || targetScale.y < 0.001 || targetScale.z < 0.001) {
            targetScale = new THREE.Vector3(1, 1, 1)
        }

        this.el.removeAttribute('animation__scale')
        this.el.setAttribute('animation__scale', {
            property: 'scale',
            from: {x: 0, y: 0, z: 0},
            to: targetScale,
            dur: this.animationDuration,
        })

        this.el.emit("menu-shown")
    },

    hide() {
        this.el.classList.remove("open")

        this.el.removeAttribute('animation__scale')
        this.el.setAttribute('animation__scale', {
            property: 'scale',
            to: {x: 0, y: 0, z: 0},
            dur: 300,
        })

        clearTimeout(this.hideTimeout)
        this.hideTimeout = setTimeout(() => {
            this.el.object3D.visible = false
            this.el.emit("menu-hidden")
        }, this.animationDuration)
    },

    _getDisplayMode() {
        let showText = this.data.showtext;
        let showIcon = true;

        if (this.items && this.items.length > 6 && this.data.layout === "circle") {
            showText = false;
            showIcon = true;
        }

        return { showText, showIcon };
    },

    update(oldData) {
        // Skip the first update loop as init() handles initial setup
        if (Object.keys(oldData).length === 0) return;

        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        
        changedProperties.forEach(property => {
            switch (property) {
                case 'size':
                    this.setSize();
                    this.recreateAll();
                    break;
                case 'items':
                    this.selected = [];
                    this.recreateAll();
                    break;
                case 'layout':
                case 'gridcolumns':
                    this.recreateAll();
                    break;
                case 'itemsopacity':
                    this.updateItemsOpacity();
                    break;
                case 'menuopacity':
                    this.updateMenuOpacity();
                    break;
                case 'color':
                case 'activecolor':
                    this.updateMenuColor();
                    break;
                case 'logoicon':
                case 'backbutton':
                    this.setSupportElements();
                    break;
                case 'showtext':
                    this.updateItemsLayout();
                    break;
                case 'selectionmode':
                    this.resetSelection();
                    break;
                case 'clickable': // No visual change, handled in event listener
                    break;
                default:
                    break;
            }
        });
    },

    recreateAll() {
        // Clean up old layout components before recreating items
        this.el.removeAttribute('grid');
        this.el.removeAttribute('circle');

        this.removeAllItems();
        this.prepareItems();
    },

    updateMenuColor() {
        this.el.setAttribute("material", { color: this.data.color });

        // Update the color of already highlighted items
        this.itemEls.forEach((item, index) => {
            if (this.selected[index] || this.flashTimeouts.has(index)) {
                this._applyItemState(index, true);
            }
        });
        
        this.setSupportElements();
    },

    updateMenuOpacity() {
        this.el.setAttribute("material", { opacity: this.data.menuopacity });
    },

    updateItemsOpacity() {
        this.el
            .querySelectorAll(".menu-item")
            .forEach(e => e.setAttribute("material", { opacity: this.data.itemsopacity }));
        
        this.setSupportElements();
    },

    updateItemsLayout() {
        const { showText, showIcon } = this._getDisplayMode();
        const sizeCoef = this.sizeCoef;
        const iconSizeWithText = sizeCoef * 1.2;
        const iconSizeNoText = sizeCoef * 1.5;
        const iconSize = showText ? iconSizeWithText : iconSizeNoText;
        const iconY = showText ? sizeCoef * 0.6 : 0;
        const baseTextY = showIcon ? -sizeCoef * 0.6 : 0;

        this.el
            .querySelectorAll(".menu-item")
            .forEach((item, index) => {
                const parsedItem = this.items[index];
                if (!parsedItem) return;

                const hasIcon = parsedItem.icon !== "" && parsedItem.icon !== undefined && parsedItem.icon !== null;
                const textY = (hasIcon && showIcon) ? baseTextY : 0;

                const textEl = item.querySelector("a-troika-text");
                if (textEl) {
                    textEl.setAttribute('visible', showText);
                    textEl.setAttribute('font-size', sizeCoef);
                    textEl.setAttribute("position", `0 ${textY} 0.01`);
                }

                const iconEl = item.querySelector("a-image");
                if (iconEl) {
                    iconEl.setAttribute('visible', showIcon);
                    iconEl.setAttribute("geometry", { width: iconSize, height: iconSize });
                    iconEl.setAttribute("position", `0 ${iconY} 0.01`);
                }
            });
    },

    setSize() {
        switch (this.data.size) {
            case "small":
                this.sizeCoef = 0.045;
                break;

            case "medium":                    
                this.sizeCoef = 0.06;
                break;

            case "large":                    
                this.sizeCoef = 0.075;
                break;

            default:
                this.sizeCoef = 0.06;
                break;
        }

        this.menuRadius = this.sizeCoef * 8.0;
        this.cellUnit = this.sizeCoef * 6.0; // the size of one cell in the grid layout
        this.el.spacing = this.menuRadius * 0.05;

        if (this.data.layout === "circle") {
            this.el.setAttribute("geometry", { primitive: "circle", radius: this.menuRadius });
        }
    },

    _appendIcon(src, size) {
        const iconEl = document.createElement("a-image");
        iconEl.setAttribute("src", src);
        iconEl.setAttribute("geometry", { width: size, height: size });
        iconEl.setAttribute("material", { 
            transparent: true, 
            alphaTest: 0.5, 
            shader: "flat" 
        });
        iconEl.setAttribute("position", { x: 0, y: 0, z: 0.02 });   
        return iconEl;
    },

    // Helper for new logic = if textColor is provided, use it no metter the contrast 
    // If not, check contrast with background color and adjust if needed.
    _getTextColor(itemTextColor, backgroungColor) {
        if (itemTextColor) return itemTextColor;
        
        const backgroungHex = `#${new AFRAME.THREE.Color(backgroungColor).getHexString()}`;
        let textColor = this.data.color;
        if (getContrast(textColor, backgroungHex) <= 60) {
            textColor = setContrastColor(backgroungHex);
        }
        return textColor;
    },

    _getHighlightedColor(parsedItem) {
        return this.data.activecolor !== "" ? this.data.activecolor : determineHighlightedColor(parsedItem.color || this.data.color);
    },

    // Colors the item (background, text and icon) as highlighted or normal.
    _applyItemState(index, highlighted) {
        const item = this.itemEls[index];
        const parsedItem = this.items[index];
        if (!item || !parsedItem) return;

        const backgroundColor = highlighted ? this._getHighlightedColor(parsedItem) : parsedItem.color;
        item.setAttribute("material", { color: backgroundColor });

        const textColor = this._getTextColor(parsedItem.textColor, backgroundColor);
        const text = item.querySelector("a-troika-text");
        if (text) text.setAttribute("color", textColor);

        // Sync icon color to match text color
        const icon = item.querySelector("a-image");
        if (icon) icon.setAttribute("color", textColor);
    },

    _getSelectedItems() {
        return this.items.filter((_, i) => this.selected[i]);
    },

    _emitSelectionEvent(name, index) {
        this.el.emit(name, { item: this.items[index], selectedItems: this._getSelectedItems() });
    },

    _clearFlash(index) {
        clearTimeout(this.flashTimeouts.get(index));
        this.flashTimeouts.delete(index);
    },

    _clearAllFlashes() {
        this.flashTimeouts.forEach(timeout => clearTimeout(timeout));
        this.flashTimeouts.clear();
    },

    // Highlights the item briefly (basic selection mode).
    _flashItem(index) {
        this._clearFlash(index);
        this._applyItemState(index, true);
        this.flashTimeouts.set(index, setTimeout(() => {
            this.flashTimeouts.delete(index);
            this._applyItemState(index, false);
        }, this.flashDuration));
    },

    onItemClick(index) {
        if (!this.data.clickable) {
            // No visual feedback, but the click is still reported.
            this._emitSelectionEvent('select', index);
            return;
        }

        switch (this.data.selectionmode) {
            case 'basic':
                this._flashItem(index);
                this._emitSelectionEvent('select', index);
                break;

            case 'single':
                if (this.selected[index]) {
                    this.selected[index] = false;
                    this._applyItemState(index, false);
                    this._emitSelectionEvent('deselect', index);
                } else {
                    // Unselect the previously selected item first
                    this.selected.forEach((isSelected, i) => {
                        if (isSelected && i !== index) {
                            this.selected[i] = false;
                            this._applyItemState(i, false);
                            this._emitSelectionEvent('deselect', i);
                        }
                    });
                    this.selected[index] = true;
                    this._applyItemState(index, true);
                    this._emitSelectionEvent('select', index);
                }
                break;

            case 'multiple':
            default:
                this.selected[index] = !this.selected[index];
                this._applyItemState(index, this.selected[index]);
                this._emitSelectionEvent(this.selected[index] ? 'select' : 'deselect', index);
                break;
        }
    },

    setItems(parsedItems) {
        this.items = parsedItems
        const sizeCoef = this.sizeCoef;

        parsedItems.sort((a, b) => parsedItems.indexOf(b) - parsedItems.indexOf(a));
        const lastTwoItems = parsedItems.splice(parsedItems.length - (parsedItems.length === 4 ? 1 : 2), 2)
        parsedItems.unshift(...lastTwoItems)

        const { showText, showIcon } = this._getDisplayMode();
        
        const nodes = parsedItems.map((parsedItem, index) => {
            const item = document.createElement("a-entity")
            item.classList.add("menu-item", "clickable")

            const isSelected = this.selected[index];
            
            parsedItem.color = parsedItem.color === undefined ? VARIANT_LIGHT_COLOR : parsedItem.color;
            const highlightedColor = this._getHighlightedColor(parsedItem);
            const itemBackgroundColor = isSelected ? highlightedColor : parsedItem.color;

            item.setAttribute("material", {
                color: itemBackgroundColor,
                opacity: this.data.itemsopacity,
            })

            const content = document.createElement("a-entity")

            const targetTextColor = this._getTextColor(parsedItem.textColor, itemBackgroundColor);

            const text = document.createElement("a-troika-text")
            text.setAttribute("visible", showText)
            text.setAttribute("value", parsedItem.title === undefined ? "" : parsedItem.title)
            text.setAttribute("align", "center")
            text.setAttribute("baseline", "center")
            text.setAttribute("anchor", "center")
            text.setAttribute("font-size", sizeCoef)
            text.setAttribute("color", targetTextColor)
            content.appendChild(text)

            let icon = null;
            const hasIcon = parsedItem.icon !== "" && parsedItem.icon !== undefined && parsedItem.icon !== null;
            
            if (hasIcon) {
                const iconSize = showText ? sizeCoef * 1.2 : sizeCoef * 1.5;
                const iconY = showText ? sizeCoef * 0.6 : 0;
                const textY = showIcon ? -sizeCoef * 0.6 : 0;

                icon = this._appendIcon(parsedItem.icon, iconSize);
                icon.setAttribute("visible", showIcon);
                icon.setAttribute("position", `0 ${iconY} 0.01`);
                icon.setAttribute("color", targetTextColor);
                content.appendChild(icon);

                text.setAttribute("position", `0 ${textY} 0.01`);
            } else {
                text.setAttribute("position", `0 0 0.01`);
            }

            item.addEventListener("click", () => this.onItemClick(index))

            item.appendChild(content)
        
            return item
        })

        this.itemEls = nodes
        this.el.append(...nodes)

        if (this.data.layout === "circle") {
            this.el.setAttribute("geometry", { primitive: "circle", radius: this.menuRadius });
            this.el.setAttribute("circle", {
                spacing: this.el.spacing,
                radius: this.menuRadius * 0.87,
                color: this.data.color,
                opacity: this.data.itemsopacity,
            })
        } else {
            // Calculate dynamic dimensions
            const cols = this.data.gridcolumns;
            const rows = Math.ceil(nodes.length / cols);
            const dynamicWidth = this.cellUnit * cols;
            const dynamicHeight = this.cellUnit * rows;

            // Update background geometry to match the grid aspect ratio
            this.el.setAttribute("geometry", { 
                primitive: "plane", 
                width: dynamicWidth, 
                height: dynamicHeight 
            });

            this.el.setAttribute("grid", {
                columns: cols,
                rows: rows,
                padding: {x: 10, y: 10}
            });
        }

        this.setSupportElements()

    },

    setSupportElements() {
        // Remove old support elements container
        const oldContainer = this.el.querySelector('[data-layout-excluded]');
        if (oldContainer) {
            oldContainer.remove();
        }

        const supportElementsContainer = document.createElement("a-entity")
        supportElementsContainer.setAttribute("data-layout-excluded", "")

        const innerCircleRadius = this.menuRadius * 0.87;
        const icon = this.data.logoicon

        if (this.data.layout === "circle") {
            const border = document.createElement("a-ring")

            border.setAttribute("radius-outer", innerCircleRadius * 1.15)
            border.setAttribute("radius-inner", innerCircleRadius * 1.12)
            border.setAttribute("material", {color: this.data.color, opacity: this.data.itemsopacity})
            border.setAttribute("geometry", {segmentsTheta: 64})
            
            supportElementsContainer.appendChild(border)
        }

        if (this.data.backbutton) {
            const arrowback = document.createElement("a-circle")
            arrowback.setAttribute("radius", 0.2 * innerCircleRadius)
            arrowback.setAttribute("material", {color: this.data.color, opacity: 1 })
            arrowback.setAttribute("position", `0 0 0.02`)
            arrowback.setAttribute("class", "back-button clickable")

            const arrowbackicon = this._appendIcon(arrowBackIcon, 0.22 * innerCircleRadius)
            arrowback.appendChild(arrowbackicon)
            arrowback.addEventListener("click", (e) => {
                arrowback.parentElement.emit('back')
                console.log('back button clicked', arrowback)
            })

            supportElementsContainer.appendChild(arrowback)
        
        } else {
            if(icon !== ""){
                const logo = document.createElement("a-circle")
                logo.classList.add("center-logo-icon", "clickable")
                logo.setAttribute("radius", 0.2 * innerCircleRadius)
                logo.setAttribute("material", {color: this.data.color, opacity: 1 })
                logo.setAttribute("position", "0 0 0.02")

                const logoicon = this._appendIcon(icon, 0.2 * innerCircleRadius)
                logoicon.setAttribute("position", "0 0 0.03")
                logo.appendChild(logoicon)
                
                logo.addEventListener("click", (e) => {
                    logo.parentElement.emit('logo')
                    console.log('logo clicked', logo)
                })

                supportElementsContainer.appendChild(logo)
            
            }
        }

        this.el.appendChild(supportElementsContainer)
    },

    removeAllItems() {
        this._clearAllFlashes()
        this.itemEls = []
        if (this.el.children.length > 0) {
            Array.from(this.el.children).forEach(el => el.parentNode.removeChild(el))
        }
    },

    resetSelection() {
        this._clearAllFlashes()
        this.selected = []
        this.itemEls.forEach((_, i) => this._applyItemState(i, false))
    },

    remove() {
        this._clearAllFlashes()
        clearTimeout(this.hideTimeout)
    }
})

AFRAME.registerComponent('grid', {
    schema: {
      columns: { type: 'int', default: 2 },
      rows: { type: 'int', default: 2 },
      padding: { type: 'vec2', default: { x: 10, y: 10 } },
      spacing: { type: 'number', default: 0 },
      // How items are fitted into their cells when the grid entity has its
      // own geometry (ignored otherwise):
      //   geometry - set geometry width/height, keep the item's primitive
      //              (items without geometry get a plane)
      //   scale    - keep geometry, scale the item in x/y (keeping its aspect
      //              ratio) to fit its cell
      //   none     - only position the items, do not resize them
      sizing: { type: 'string', default: 'geometry', oneOf: ['geometry', 'scale', 'none'] }
    },

    init() {
        this.timeout = null;
        this.retryTimeout = null;
        this.retryCount = 0;
        this.debouncedUpdate = () => {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => this.updateLayout(), 20);
        };

        this.childAttachedHandler = (e) => {
            if (e.detail.el && !e.detail.el.hasAttribute("data-layout-excluded")) {
                this.debouncedUpdate();
            }
        };
        
        this.el.addEventListener("child-attached", this.childAttachedHandler);
        this.el.addEventListener("child-detached", this.debouncedUpdate);
    },

    update() { this.updateLayout(); },

    remove() {
        this.el.removeEventListener("child-attached", this.childAttachedHandler);
        this.el.removeEventListener("child-detached", this.debouncedUpdate);
        clearTimeout(this.timeout);
        clearTimeout(this.retryTimeout);
    },

    updateLayout() {
        const gridItems = Array.from(this.el.children).filter(el => !el.hasAttribute("data-layout-excluded"));
        if (gridItems.length === 0) return;

        const elGeometry = this.el.getAttribute("geometry");

        if (elGeometry) {
            // The grid has its own (plane) geometry, e.g. when driven by the
            // menu component: stretch the children to fill the available area.
            this.layoutInGeometry(elGeometry, gridItems);
        } else {
            // Plain `<a-entity grid>` with arbitrary children: keep the
            // children's own size and arrange them in a centered grid.
            this.layoutByItemSize(gridItems);
        }
    },

    layoutInGeometry(elGeometry, gridItems) {
        const gridWidth = elGeometry.width || 1;
        const gridHeight = elGeometry.height || 1;

        const cols = this.data.columns;
        const rows = Math.ceil(gridItems.length / cols);

        // Convert percentage to a factor
        const padXFactor = this.data.padding.x / 100;
        const padYFactor = this.data.padding.y / 100;

        // 1. Calculate the size of a SINGLE gap
        // Divide total padding by (count + 1) to get equal gaps inside and out
        const singleGapX = (gridWidth * padXFactor) / (cols + 1);
        const singleGapY = (gridHeight * padYFactor) / (rows + 1);

        // 2. Calculate the item size (Total size minus all gaps, divided by item count)
        const itemWidth = (gridWidth - (singleGapX * (cols + 1))) / cols;
        const itemHeight = (gridHeight - (singleGapY * (rows + 1))) / rows;

        let needsRetry = false;

        gridItems.forEach((item, index) => {
            switch (this.data.sizing) {
                case "scale":
                    if (!this.scaleItemToCell(item, itemWidth, itemHeight)) {
                        needsRetry = true;
                    }
                    break;
                case "none":
                    break;
                default:
                    this.resizeItemGeometry(item, itemWidth, itemHeight);
            }

            const colIndex = index % cols;
            const rowIndex = Math.floor(index / cols);

            // 3. Position the item
            // Start at the left edge + the first gap + previous items/gaps + half of current item
            item.object3D.position.x = (-gridWidth / 2) + singleGapX + (colIndex * (itemWidth + singleGapX)) + (itemWidth / 2);

            // Start at top edge - the first gap - previous items/gaps - half of current item
            item.object3D.position.y = (gridHeight / 2) - singleGapY - (rowIndex * (itemHeight + singleGapY)) - (itemHeight / 2);

            item.object3D.position.z = 0.01;
        });

        // In `scale` mode some items may not have a measurable size yet
        // (e.g. troika text that has not synced). Try again shortly.
        clearTimeout(this.retryTimeout);
        if (needsRetry && this.retryCount < 10) {
            this.retryCount++;
            this.retryTimeout = setTimeout(() => this.updateLayout(), 100);
        } else {
            this.retryCount = 0;
        }
    },

    /**
     * Sets the item's geometry width/height to the cell size while keeping
     * its primitive (a box stays a box, keeping its depth). Items without
     * geometry get a plane, e.g. items created by the menu component.
     */
    resizeItemGeometry(item, width, height) {
        if (!item.components.geometry && !item.hasAttribute("geometry")) {
            item.setAttribute("geometry", { primitive: "plane", width, height });
        } else {
            // Partial update: A-Frame merges it with the existing geometry.
            item.setAttribute("geometry", { width, height });
        }
        // Reset x/y scale so the item matches the cell exactly; keep z
        // so that the depth of the item is not affected.
        item.object3D.scale.x = 1;
        item.object3D.scale.y = 1;
    },

    /**
     * Uniformly scales the item (including its children) in x/y so that it
     * fits into the cell while keeping its aspect ratio and geometry.
     * The z scale is left untouched, so the depth of the item is kept.
     * Returns false if the item has no measurable size yet.
     */
    scaleItemToCell(item, width, height) {
        const object3D = item.object3D;
        const originalRotation = object3D.rotation.clone();
        const originalScale = object3D.scale.clone();

        // Measure the unscaled, unrotated size of the item in grid-local space.
        object3D.scale.x = 1;
        object3D.scale.y = 1;
        object3D.rotation.set(0, 0, 0);
        this.el.object3D.updateWorldMatrix(true, true);
        const inverseGridMatrix = new THREE.Matrix4().copy(this.el.object3D.matrixWorld).invert();
        const bbox = new THREE.Box3();
        const childBounds = new THREE.Box3();
        const relativeMatrix = new THREE.Matrix4();
        object3D.traverse((child) => {
            let bounds;
            if (child.boundingBox !== undefined) {
                if (child.boundingBox === null) child.computeBoundingBox();
                bounds = child.boundingBox;
            } else if (child.geometry) {
                if (child.geometry.boundingBox === null) child.geometry.computeBoundingBox();
                bounds = child.geometry.boundingBox;
            }
            if (!bounds) return;

            relativeMatrix.multiplyMatrices(inverseGridMatrix, child.matrixWorld);
            childBounds.copy(bounds).applyMatrix4(relativeMatrix);
            bbox.union(childBounds);
        });
        object3D.rotation.copy(originalRotation);
        object3D.scale.copy(originalScale);

        if (bbox.isEmpty()) return false;

        const size = bbox.getSize(new THREE.Vector3());
        const itemWidth = size.x;
        const itemHeight = size.y;

        if (itemWidth <= 0 || itemHeight <= 0) return false;

        const factor = Math.min(width / itemWidth, height / itemHeight);
        object3D.scale.x = factor;
        object3D.scale.y = factor;
        return true;
    },

    layoutByItemSize(gridItems) {
        const cols = this.data.columns;
        const rows = Math.ceil(gridItems.length / cols);
        const spacing = this.data.spacing;

        // Use the largest child bounding box as the cell size so that items of
        // different sizes still align on a regular grid.
        let cellWidth = 0;
        let cellHeight = 0;
        const size = new THREE.Vector3();

        gridItems.forEach((item) => {
            const bbox = computeBbox(item);
            if (!bbox.isEmpty()) {
                bbox.getSize(size);
                cellWidth = Math.max(cellWidth, size.x);
                cellHeight = Math.max(cellHeight, size.y);
            }
        });

        // Fall back to a unit cell if the meshes aren't ready yet.
        if (cellWidth === 0) cellWidth = 1;
        if (cellHeight === 0) cellHeight = 1;

        const stepX = cellWidth + spacing;
        const stepY = cellHeight + spacing;

        gridItems.forEach((item, index) => {
            const colIndex = index % cols;
            const rowIndex = Math.floor(index / cols);

            // Center the grid around the entity's origin.
            item.object3D.position.x = (colIndex - (cols - 1) / 2) * stepX;
            item.object3D.position.y = -(rowIndex - (rows - 1) / 2) * stepY;
            item.object3D.position.z = 0;
        });
    }
});

AFRAME.registerComponent('circle', {
    schema: {
        radius: { type: "number", default: 1 },
        spacing: { type: "number", default: 0 },
        color: { type: "color", default: "blue" },
        opacity: { type: "number", default: 1 }
      },
  
      isAnimating: false,
      
      init() {
        this.timeout = null;
        this.debouncedUpdate = () => {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => this.updateLayout(), 20);
        };

        this.childAttachedHandler = (e) => {
            if (e.detail.el && !e.detail.el.hasAttribute("data-layout-excluded")) {
                this.debouncedUpdate();
            }
        };
        
        this.el.addEventListener("child-attached", this.childAttachedHandler);
        this.el.addEventListener("child-detached", this.debouncedUpdate);

        this.updateLayout();
      },

      remove() {
        this.el.removeEventListener("child-attached", this.childAttachedHandler);
        this.el.removeEventListener("child-detached", this.debouncedUpdate);
        clearTimeout(this.timeout);
      },

      updateLayout() {
        const circleSpacing = this.data.spacing
        const circleRadius = this.data.radius

        const children = Array.from(this.el.children).filter((el) => !el.hasAttribute("data-layout-excluded"))

        children.forEach((child, index) => {
            const oddItemsLengthAngleSubtraction = children.length % 2 === 1 ? 360/children.length * (3/4) : 0
            
            const thetaStartAngle = index * (360/children.length) - oddItemsLengthAngleSubtraction
            const radFromDegrees = ((thetaStartAngle + (360/children.length)/2)) * (Math.PI/180)
            
            child.setAttribute("geometry", { primitive: "circle", radius: circleRadius, thetaLength: 360/children.length, thetaStart: thetaStartAngle, segments: 64})
            child.setAttribute("position", `${circleSpacing * Math.cos(radFromDegrees)} ${circleSpacing * Math.sin(radFromDegrees)} 0.01`)

            // text and icon position
            child.children[0]?.setAttribute("position", `${0.6*Math.cos(radFromDegrees)*circleRadius} ${0.6*Math.sin(radFromDegrees)*circleRadius} 0.01`)
        })
      }
})
