import * as AFRAME from "aframe"
import "aframe-troika-text"
import { PRIMARY_COLOR_DARK, determineHighlightedColor } from "../utils/colors.js"
import { getContrast, setContrastColor } from "../utils/utils.js"

AFRAME.registerComponent("menu", {
    schema: { 
        size: { type: "string", default: "medium" },
        items: { type: "string", default: "" },
        itemsopacity: { type: "number", default: 1 },
        menuopacity: { type: "number", default: 1 },
        color: {type: "string", default: PRIMARY_COLOR_DARK},
        clickable: {type: "boolean", default: true},
        variant: { type: "string", default: "filled" },
        layout: { type: "string", default: "grid" },
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

    update(oldData) {
        // Update the background color if the `color` property changes
        if (oldData.color !== this.data.color) {
            this.el.setAttribute("material", { color: this.data.color });

            // Update the color of already selected items
            this.el
                .querySelectorAll(".menu-item")
                .forEach((item, index) => {
                    if (this.selected[index]) {
                        const highlightedColor = determineHighlightedColor(this.data.color);
                        item.setAttribute("material", { color: highlightedColor });

                        const parsedItem = this.items[index];
                        const text = item.querySelector("a-troika-text");
                        const targetTextColor = this._getTextColor(parsedItem.textColor, highlightedColor);
                        if (text) text.setAttribute("color", targetTextColor);
                    }
                });
        }

        this.replaceItemsIfChanged(oldData.items);

        this.el
            .querySelectorAll(".menu-item")
            .forEach(e => e.setAttribute("material", { opacity: this.data.itemsopacity }));

        const sizeCoef = this.sizeCoef;
        const iconSizeWithText = sizeCoef;
        const iconSizeNoText = sizeCoef * 1.5;
        const iconSize = this.data.showtext ? iconSizeWithText : iconSizeNoText;
        const iconY = this.data.showtext ? sizeCoef * 0.6 : 0;
        const textY = this.data.showtext ? -sizeCoef * 0.6 : 0;

        this.el
            .querySelectorAll(".menu-item a-troika-text")
            .forEach(e => {
                e.setAttribute('visible', this.data.showtext);
                e.setAttribute('font-size', sizeCoef);
                e.setAttribute("position", `0 ${textY} 0.01`);
            });

        this.el
            .querySelectorAll(".menu-item a-image")
            .forEach(e => {
                e.setAttribute('height', iconSize);
                e.setAttribute('width', iconSize);
                e.setAttribute("position", `0 ${iconY} 0.01`);
            });

        this.el
            .querySelectorAll("a-ring")
            .forEach(e => {
                e.setAttribute("radius-outer", this.menuRadius);
                e.setAttribute("radius-inner", this.menuRadius * 0.974);
                e.setAttribute("material", { color: this.data.color, opacity: this.data.itemsopacity });
                e.setAttribute("geometry", { segmentsTheta: 64 });
            });
    },

    setSize() {
        switch (this.data.size) {
            case "small":
                this.sizeCoef = 0.055;
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

        this.menuRadius = this.sizeCoef * 6.0;
        this.gridDim = this.sizeCoef * 10.0;
        this.el.spacing = this.menuRadius * 0.05;

        if (this.data.layout === "circle") {
            this.el.setAttribute("geometry", { primitive: "circle", radius: this.menuRadius });
        } else {
            this.el.setAttribute("geometry", { primitive: "plane", width: this.gridDim, height: this.gridDim });
            this.el.setAttribute("width", this.gridDim);
            this.el.setAttribute("height", this.gridDim);
        }
    },

    _appendIcon(src, size, id) {
        const iconEl = document.createElement("a-image");
        if (id) iconEl.setAttribute("id", id);
        iconEl.setAttribute("src", src);
        iconEl.setAttribute("geometry", { width: size, height: size });
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

        // Sorting items backwards, then moving last two items to the front (one if there are 4 items) to get them in the right order.
        
        const nodes = parsedItems.map((parsedItem, index) => {
            const item = document.createElement("a-entity")
            item.classList.add("menu-item", "clickable")

            parsedItem.color = parsedItem.color === undefined ? 'white' : parsedItem.color
            item.setAttribute("material", {
                color: parsedItem.color,
                // opacity: this.data.variant === "transparent" ? 0.5 : 1,
                opacity: this.data.itemsopacity,
                transparent: this.data.variant === "transparent",
            })

            const content = document.createElement("a-entity")

            const targetTextColor = this._getTextColor(parsedItem.textColor, parsedItem.color);

            const text = document.createElement("a-troika-text")
            text.setAttribute("visible", this.data.showtext)
            text.setAttribute("value", parsedItem.title === undefined ? "" : parsedItem.title)
            text.setAttribute("align", "center")
            text.setAttribute("baseline", "center")
            text.setAttribute("anchor", "center")
            text.setAttribute("font-size", sizeCoef)
            text.setAttribute("color", targetTextColor)
            text.classList.add("size-reference-text")
            content.appendChild(text)

            let icon = null;
            if (parsedItem.icon !== "" && parsedItem.icon !== undefined && parsedItem.icon !== null) {
                const iconSize = this.data.showtext ? sizeCoef : sizeCoef * 1.5;
                const iconY = this.data.showtext ? sizeCoef * 0.6 : 0;
                const textY = this.data.showtext ? -sizeCoef * 0.6 : 0;

                icon = this._appendIcon(parsedItem.icon, iconSize);
                icon.classList.add('size-reference-image');
                icon.setAttribute("position", `0 ${iconY} 0.01`);
                content.appendChild(icon);

                text.setAttribute("position", `0 ${textY} 0.01`);
            } else {
                text.setAttribute("position", `0 0 0.01`);
            }

            item.addEventListener("click", (e) => {
                if (this.data.clickable) {
                    this.selected[index] = !this.selected[index];

                    // Calculate suitable highlighted color based on color lightness
                    const highlightedColor = determineHighlightedColor(this.data.color);
                    const itemBackgroungColor = this.selected[index] ? highlightedColor : `${parsedItem.color}`;

                    item.setAttribute("material", {
                        color: itemBackgroungColor
                    });

                    const currentTargetTextColor = this._getTextColor(parsedItem.textColor, itemBackgroungColor);
                    if (text) text.setAttribute("color", currentTargetTextColor);
                }

                item.parentElement.emit('select', {item: parsedItem});
            })

            item.appendChild(content)
        
            return item
        })

        this.el.append(...nodes)

        if (this.data.layout === "circle") {
            this.el.setAttribute("circle", {
                spacing: this.el.spacing,
                radius: this.menuRadius * 0.87,
                color: this.data.color,
                opacity: this.data.itemsopacity,
            })
        } else {
            this.el.setAttribute("grid", {
                spacing: this.el.spacing,
            })
        }

        this.setSupportElements()

    },

    setSupportElements() {
        const supportElementsContainer = document.createElement("a-entity")
        supportElementsContainer.setAttribute("data-layout-excluded", "")

        const innerCircleRadius = this.menuRadius * 0.87;
        const icon = this.data.logoicon
        const border = document.createElement("a-ring")
        console.log("border", border)

        border.setAttribute("radius-outer", innerCircleRadius * 1.15)
        border.setAttribute("radius-inner", innerCircleRadius * 1.12)
        border.setAttribute("material", {color: this.data.color, opacity: this.data.opacity})
        border.setAttribute("geometry", {segmentsTheta: 64})
        
        supportElementsContainer.appendChild(border)

        if(this.data.backbutton){
        const arrowback = document.createElement("a-circle")
        arrowback.setAttribute("radius", 0.2 * innerCircleRadius)
        arrowback.setAttribute("material", {color: this.data.color, opacity: 1 })
        arrowback.setAttribute("position", `0 0 0.02`)
        arrowback.setAttribute("class", "back-button clickable")

        const arrowbackicon = document.createElement("a-image")
        arrowbackicon.setAttribute("src", "/public/arrow_back_white.png")
        arrowbackicon.setAttribute("height", 0.22 * innerCircleRadius)
        arrowbackicon.setAttribute("width", 0.22 * innerCircleRadius)
        arrowbackicon.setAttribute("position", "0 0 0.02")
        arrowback.appendChild(arrowbackicon)
        arrowback.addEventListener("click", (e) => {
            arrowback.parentElement.emit('back')
            console.log('back button clicked', arrowback)
        })

        supportElementsContainer.appendChild(arrowback)
        
        } else {
            if(icon !== ""){
            const logo = document.createElement("a-circle")
            logo.classList.add("center-logo-icon")
            logo.setAttribute("radius", 0.2 * innerCircleRadius)
            logo.setAttribute("material", {color: this.data.color, opacity: 1 })
            logo.setAttribute("position", "0 0 0.02")

            if(icon !== "" && icon !== undefined) {
                const logoicon = document.createElement("a-image")

                let myImg = new Image;
                myImg.src = icon;
                myImg.onload = function(){
                    logoicon.setAttribute("src", icon)
                    logoicon.setAttribute("height", 0.2 * innerCircleRadius)
                    logoicon.setAttribute("width", 0.2 * innerCircleRadius)
                    logoicon.setAttribute("position", "0 0 0.03")
                    logo.appendChild(logoicon)
                }
            }
            
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

    /**
     * @param {{icon: string, title: string, color: string}} oldItems Items from oldData
     */
    replaceItemsIfChanged(oldItems) {
        if (oldItems && this.data.items !== oldItems) {
            this.removeAllItems()
            this.prepareItems()
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
      padding: { type: 'vec2', default: { x: 0, y: 0 } }
    },
 
    isAnimating: false,
   
    init() {
      this.initGridProperties();
      this.setLayout();
    },
 
    initGridProperties() {
        const elGeometry = this.el.getObject3D("mesh")?.geometry;
 
        this.gridWidth = elGeometry?.parameters?.width || 1;
        this.gridHeight = elGeometry?.parameters?.height || 1;
        this.gridDepth = elGeometry?.parameters?.depth || 0; 
        this.gridItems = Array.from(this.el.children);

        this.normalizedPadding = {};
        this.normalizedPadding.x = this.data.padding.x > 0 && this.data.padding.x < 100 ? this.data.padding.x / 100 : 0;
        this.normalizedPadding.y = this.data.padding.y > 0 && this.data.padding.y < 100 ? this.data.padding.y / 100 : 0;

        this.gridColumns = this.data.columns;
        this.gridRows = this.data.rows;

        // Check, if `a-ar-row` or `a-ar-column` is used
        if (this.gridRows === 1) {
          this.gridColumns = this.gridColumns > this.gridItems.length ? this.gridColumns : this.gridItems.length;
        } else if (this.gridColumns === 1) {
          this.gridRows = this.gridRows > this.gridItems.length ? this.gridRows : this.gridItems.length;
        }

        const actualGridRows = Math.ceil(this.gridItems.length / this.gridColumns); 

        // Use `actualGridRows` to prevent items overflow
        if (actualGridRows > this.gridRows) {
          this.gridRows = actualGridRows;
        }
    },
 
    setLayout() { 
      const itemWidth = this.gridWidth / this.gridColumns;
      const itemHeight = this.gridHeight / this.gridRows;

      const itemBaseXPosition = -this.gridWidth / 2 + itemWidth / 2 - itemWidth / 2 * this.normalizedPadding.x;
      const itemBaseYPosition = this.gridHeight / 2 - itemHeight / 2 + itemHeight / 2 * this.normalizedPadding.y;
      const itemXOffset = itemWidth + (itemWidth * this.normalizedPadding.x) / Math.max(this.gridColumns - 1, 1);
      const itemYOffset = itemHeight + (itemHeight * this.normalizedPadding.y) / Math.max(this.gridRows - 1, 1);

      let xIndex = 0;
      let yIndex = 0;

      for (const item of this.gridItems) {
        const itemBbox = new THREE.Box3().setFromObject(item.object3D);
        const itemBboxSize = itemBbox.getSize(new THREE.Vector3());

        item.object3D.position.x = itemBaseXPosition + itemXOffset * xIndex;
        item.object3D.position.y = itemBaseYPosition + itemYOffset * yIndex;
        // Adding `gridHeight * 0.01` prevents overlap issues when items share the same depth as the grid (e.g. planes)
        item.object3D.position.z = this.gridDepth / 2 + itemBboxSize.z / 2 + this.gridHeight * 0.01;
                
        item.object3D.scale.x = itemWidth / itemBboxSize.x - (itemWidth / itemBboxSize.x) * this.normalizedPadding.x;
        item.object3D.scale.y = itemHeight / itemBboxSize.y - (itemHeight / itemBboxSize.y) * this.normalizedPadding.y;

        xIndex++;
 
        if (xIndex >= this.gridColumns) {
          xIndex = 0;
          yIndex--;
        }
      }
    }
})

AFRAME.registerComponent('circle', {
    schema: {
        radius: { type: "number", default: 1 },
        spacing: { type: "number", default: 0.1 },
        color: { type: "color", default: "blue" },
        opacity: { type: "number", default: 1 }
      },
  
      isAnimating: false,
      
      init() {
        this.updateLayout()

        // Below is a timeout to avoid calling `updateLayout` multiple times
        // This is needed due to the nature of `child-attached` event
        // https://aframe.io/docs/1.4.0/core/entity.html#event-detail
        let timeout = null
        this.el.addEventListener("child-attached", (e) => {
            if (!e.detail.el.hasAttribute("data-layout-excluded")) {
                clearTimeout(timeout)
                
                timeout = setTimeout(() => {
                    this.updateLayout()
                }, 20)
            }
        })

        // The same timeout is used to prevent `updateLayout` from being called
        // when replacing items in `menu` (adding and removing at the same time triggers both events) 
        // Otherwise it works as intended
        this.el.addEventListener("child-detached", () => {
            clearTimeout(timeout)

            timeout = setTimeout(() => {
                this.updateLayout()
            }, 20)
        })
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
