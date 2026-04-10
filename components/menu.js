import * as AFRAME from "aframe"
import "aframe-troika-text"
import { PRIMARY_COLOR_DARK, VARIANT_LIGHT_COLOR, determineHighlightedColor } from "../utils/colors.js"
import { getContrast, setContrastColor } from "../utils/utils.js"
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
    },

    init() {
        this.selected = [];
        this.animationDuration = 300

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
    },

    hide() {
        this.el.classList.remove("open")

        this.el.removeAttribute('animation__scale')
        this.el.setAttribute('animation__scale', {
            property: 'scale',
            to: {x: 0, y: 0, z: 0},
            dur: 300,
        })

        setTimeout(() => {
            this.el.object3D.visible = false
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

        // Update the color of already selected items
        this.el
            .querySelectorAll(".menu-item")
            .forEach((item, index) => {
                if (this.selected[index]) {
                    const parsedItem = this.items[index];
                    const highlightedColor = this.data.activecolor !== "" ? this.data.activecolor : determineHighlightedColor(parsedItem.color || this.data.color);
                    item.setAttribute("material", { color: highlightedColor });
                    const targetTextColor = this._getTextColor(parsedItem.textColor, highlightedColor);

                    const text = item.querySelector("a-troika-text");
                    if (text) text.setAttribute("color", targetTextColor);

                    // Sync icon color to match text color
                    const icon = item.querySelector("a-image");
                    if (icon) icon.setAttribute("color", targetTextColor);
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
            const highlightedColor = this.data.activecolor !== "" ? this.data.activecolor : determineHighlightedColor(parsedItem.color);
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

            item.addEventListener("click", (e) => {
                if (this.data.clickable) {
                    this.selected[index] = !this.selected[index];

                    // Calculate suitable highlighted color based on color lightness
                    const highlightedColor = this.data.activecolor !== "" ? this.data.activecolor : determineHighlightedColor(parsedItem.color);
                    const itemBackgroundColor = this.selected[index] ? highlightedColor : `${parsedItem.color}`;

                    item.setAttribute("material", {
                        color: itemBackgroundColor
                    });

                    const currentTargetTextColor = this._getTextColor(parsedItem.textColor, itemBackgroundColor);
                    if (text) text.setAttribute("color", currentTargetTextColor);
                    const iconEl = item.querySelector("a-image");
                    if (iconEl) iconEl.setAttribute("color", currentTargetTextColor);
                }

                item.parentElement.emit('select', {item: parsedItem});
            })

            item.appendChild(content)
        
            return item
        })

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
        if (this.el.children.length > 0) {
            Array.from(this.el.children).forEach(el => el.parentNode.removeChild(el))
        }
    },

    resetSelection() {
        this.el
            .querySelectorAll(".menu-item")
            .forEach((item, i) => {
                const parsedItem = this.items[i]
                const text = item.querySelector("a-troika-text")
                const icon = item.querySelector("a-image")

                item.setAttribute("material", {color: parsedItem.color})
                
                const targetTextColor = this._getTextColor(parsedItem.textColor, parsedItem.color);
                if (text) text.setAttribute("color", targetTextColor);
                icon?.setAttribute("src", parsedItem.icon)
            })
        this.selected = []
    }
})

AFRAME.registerComponent('grid', {
    schema: {
      columns: { type: 'int', default: 2 },
      rows: { type: 'int', default: 2 },
      padding: { type: 'vec2', default: { x: 10, y: 10 } }
    },

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
    },

    update() { this.updateLayout(); },

    remove() {
        this.el.removeEventListener("child-attached", this.childAttachedHandler);
        this.el.removeEventListener("child-detached", this.debouncedUpdate);
        clearTimeout(this.timeout);
    },

    updateLayout() {
        const elGeometry = this.el.getAttribute("geometry");
        if (!elGeometry) return;

        const gridWidth = elGeometry.width || 1;
        const gridHeight = elGeometry.height || 1;
        const gridItems = Array.from(this.el.children).filter(el => !el.hasAttribute("data-layout-excluded"));
        
        if (gridItems.length === 0) return;

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

        gridItems.forEach((item, index) => {
            if (!item.hasAttribute("geometry")) {
                item.setAttribute("geometry", { primitive: "plane", width: 1, height: 1 });
            }

            // Update item geometry to the calculated width/height
            item.setAttribute("geometry", { 
                primitive: "plane", 
                width: itemWidth, 
                height: itemHeight 
            });
            item.object3D.scale.set(1, 1, 1);

            const colIndex = index % cols;
            const rowIndex = Math.floor(index / cols);

            // 3. Position the item
            // Start at the left edge + the first gap + previous items/gaps + half of current item
            item.object3D.position.x = (-gridWidth / 2) + singleGapX + (colIndex * (itemWidth + singleGapX)) + (itemWidth / 2);
            
            // Start at top edge - the first gap - previous items/gaps - half of current item
            item.object3D.position.y = (gridHeight / 2) - singleGapY - (rowIndex * (itemHeight + singleGapY)) - (itemHeight / 2);
            
            item.object3D.position.z = 0.01;
        });
    }
});

AFRAME.registerComponent('circle', {
    schema: {
        radius: { type: "number", default: 1 },
        spacing: { type: "number", default: 0.1 },
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
        const circleSpacing = this.el.spacing
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
