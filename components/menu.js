import * as AFRAME from "aframe"
import { PRIMARY_COLOR_DARK } from "../utils/colors.js"

// Lighten color in order to create suitable highlilighted color
function lightenColor(color, percent) {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = color; // Convert named colors to hex
    const hex = ctx.fillStyle;

    const [r, g, b] = [1, 3, 5].map(i => 
        Math.min(255, parseInt(hex.slice(i, i + 2), 16) + Math.round((255 - parseInt(hex.slice(i, i + 2), 16)) * (percent / 100)))
    );

    return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

// Darken color in order to create suitable highlilighted color
function darkenColor(color, percent) {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = color; // Convert named colors to hex
    const hex = ctx.fillStyle;

    const [r, g, b] = [1, 3, 5].map(i => 
        Math.max(0, parseInt(hex.slice(i, i + 2), 16) - Math.round(parseInt(hex.slice(i, i + 2), 16) * (percent / 100)))
    );

    return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}


function getColorLightness(color) {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = color; // Convert named colors to hex
    const hex = ctx.fillStyle;

    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

    // Calculate relative luminance (perceived lightness)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 * 100; // Return as percentage
}

function determineHighlightedColor(color) {
    const colorLightness = getColorLightness(color);
    let difference = 30; // Default difference

    // Adjust difference for very light or very dark colors
    if (colorLightness >= 90 || colorLightness <= 10) {
        difference = 40;
    }

    // Calculate suitable highlighted color based on color lightness
    return colorLightness <= 50
        ? lightenColor(color, difference) // Lighter for dark colors
        : darkenColor(color, difference); // Darker for light colors
}

AFRAME.registerComponent("menu", {
    schema: { 
        size: { type: "string", default: "medium" },
        items: { type: "string", default: "" },
        itemsopacity: { type: "number", default: 1 },
        menuopacity: { type: "number", default: 1 },
        color: {type: "string", default: PRIMARY_COLOR_DARK},
        highlight: {type: "boolean", default: true},
        variant: { type: "string", default: "filled" },
        layout: { type: "string", default: "grid" },
        spacing: { type: "number", default: 0.1 },
        contentSize: { type: "number", default: 1},
        logoicon: { type: "string", default: "" },
        textsize: { type: "number", default: 1.5 },
        iconsize: { type: "number", default: 1.5 },
        backbutton: {type: 'boolean', default: false},
        showtext: {type: 'boolean', default: true},
    },

    init() {
        this.selected = [];
        this.animationDuration = 300

        this.originalScale = this.el.object3D.scale.clone()

        // this.el.setAttribute("material", {color: this.data.primary, opacity: this.data.variant === "transparent" ? 0.1 : 0.35})
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
        const parsedItems = JSON.parse(this.data.items.replaceAll("'", "\""))
        if(parsedItems.length > 6) {
            alert("Maximum of 6 items allowed")
            parsedItems.splice(6)
        } else if(parsedItems.length < 2) {
            alert("Minimum of 2 items required")
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
            document
                .querySelectorAll(".menu-item")
                .forEach((item, index) => {
                    if (this.selected[index]) {
                        const highlightedColor = determineHighlightedColor(this.data.color);
                        item.setAttribute("material", { color: highlightedColor });
                    }
                });
        }

        this.replaceItemsIfChanged(oldData.items);

        document
            .querySelectorAll(".menu-item")
            .forEach(e => e.setAttribute("material", { opacity: this.data.itemsopacity }));

        const circleRadius = this.el.getAttribute("geometry").radius;
        document
            .querySelectorAll(".menu-item a-text")
            .forEach(e => {
                e.setAttribute('width', 1.5 * circleRadius * this.data.textsize);
                e.setAttribute('visible', this.data.showtext);
            });

        let iconSize = 0.25 * circleRadius * this.data.iconsize;
        let isTextVisibleCoef = 1;
        if (!this.data.showtext) {
            iconSize *= 1.6;
            isTextVisibleCoef = 0.1;
        }
        document
            .querySelectorAll(".menu-item a-image")
            .forEach(e => {
                e.setAttribute('height', iconSize);
                e.setAttribute('width', iconSize);
                e.setAttribute("position", `0 ${(this.data.textsize - 1) * 0.1 * isTextVisibleCoef} 0`);
            });

        document
            .querySelectorAll("a-ring")
            .forEach(e => {
                e.setAttribute("radius-outer", circleRadius);
                e.setAttribute("radius-inner", circleRadius * 0.974);
                e.setAttribute("material", { color: this.data.color, opacity: this.data.itemsopacity });
                e.setAttribute("geometry", { segmentsTheta: 64 });
            });
    },

    setSize() {
        switch (this.data.size) {
            case "small":
                if (this.data.layout === "circle") {
                    this.el.setAttribute("geometry", {radius: 0.5})
                } else {
                    this.el.setAttribute("width", 1)
                    this.el.setAttribute("height", 1)
                }
                this.el.spacing = 0.05
                this.el.contentSize = 0.5
                // this.el.contentSize = 0.85
                break

            case "medium":                    
            if (this.data.layout === "circle") {
                this.el.setAttribute("geometry", {radius: 1.5})
            } else {
                this.el.setAttribute("width", 3)
                this.el.setAttribute("height", 3)
            }
            this.el.spacing = 0.15
            this.el.contentSize = 1
            break

            case "large":                    
            if (this.data.layout === "circle") {
                this.el.setAttribute("geometry", {radius: 2})
            } else {
                this.el.setAttribute("width", 6)
                this.el.setAttribute("height", 6)
            }
            this.el.spacing = 0.2
            this.el.contentSize = 1.25
            break  

            case "extra-large":                     
            if (this.data.layout === "circle") {
                this.el.setAttribute("geometry", {radius: 2.5})
            } else {
                this.el.setAttribute("width", 9)
                this.el.setAttribute("height", 9)
            }
            this.el.spacing = 0.25
            this.el.contentSize = 1.4
            break

            default:
                if (this.data.layout === "circle") {
                    this.el.setAttribute("geometry", {radius: 1.5})
                } else {
                    this.el.setAttribute("width", 3)
                    this.el.setAttribute("height", 3)
                }
                this.el.spacing = 0.15
                this.el.contentSize = 1
                break
        }
    },

    setItems(parsedItems) {
        this.items = parsedItems

        const circleRadius = this.el.getAttribute("geometry").radius
        const contentSize = this.data.textsize

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

            const text = document.createElement("a-text")
            const textColor = parsedItem.textColor ?? this.data.color
            text.setAttribute("visible", this.data.showtext)
            text.setAttribute("value", parsedItem.title === undefined ? "" : parsedItem.title)
            text.setAttribute("align", "center")
            text.setAttribute("position", `0 ${-0.2 * circleRadius} 0`)
            text.setAttribute("width", 1.5 * circleRadius * contentSize)
            text.setAttribute("color", textColor)
            text.classList.add("size-reference-text")
            content.appendChild(text)

            let icon = null;
            if (parsedItem.icon !== "" && parsedItem.icon !== undefined && parsedItem.icon !== null) {
                icon = document.createElement("a-image")
                icon.classList.add('size-reference-image')

                let myImg = new Image;
                myImg.src =`${parsedItem.icon}.png`;
                const iconSize = 0.25 * circleRadius * contentSize
                const iconPosition = `0 ${(this.data.textsize - 1) * 0.1} 0`

                myImg.onload = function(){
                    icon.setAttribute("src", `${parsedItem.icon}.png`)
                    icon.setAttribute("height", iconSize)
                    icon.setAttribute("width", iconSize)
                    icon.setAttribute("position", iconPosition)
                    icon.setAttribute("material", {alphaTest: 0.5})
                    content.appendChild(icon)
                }
            }

            item.addEventListener("click", (e) => {
                if (this.data.highlight) {
                    this.selected[index] = !this.selected[index];

                    // Calculate suitable highlighted color based on color lightness
                    const highlightedColor = determineHighlightedColor(this.data.color);

                    item.setAttribute("material", {
                        color: this.selected[index] ? highlightedColor : `${parsedItem.color}`
                    });
                    text.setAttribute("color", this.selected[index] ? `white` : `${textColor}`);

                    const iconSrc = this.selected[index] 
                        ? `${parsedItem.icon}-white.png` 
                        : `${parsedItem.icon}.png`;

                    // Check if the `-white` version exists, fallback to the original if not
                    const img = new Image();
                    img.src = iconSrc;
                    img.onload = () => icon?.setAttribute("src", iconSrc);
                    img.onerror = () => icon?.setAttribute("src", `${parsedItem.icon}.png`);
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
                radius: this.el.getAttribute("geometry").radius * 0.87,
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

        const circleRadius = this.el.getAttribute("geometry").radius * 0.87
        const icon = this.data.logoicon
        const border = document.createElement("a-ring")
        console.log("border", border)

        border.setAttribute("radius-outer", circleRadius * 1.15)
        border.setAttribute("radius-inner", circleRadius * 1.12)
        border.setAttribute("material", {color: this.data.color, opacity: this.data.opacity})
        border.setAttribute("geometry", {segmentsTheta: 64})
        
        supportElementsContainer.appendChild(border)

        if(this.data.backbutton){
        const arrowback = document.createElement("a-circle")
        arrowback.setAttribute("radius", 0.2 * circleRadius)
        arrowback.setAttribute("material", {color: this.data.color, opacity: 1 })
        arrowback.setAttribute("position", `0 0 0.02`)
        arrowback.setAttribute("class", "back-button clickable")

        const arrowbackicon = document.createElement("a-image")
        arrowbackicon.setAttribute("src", "/public/arrow_back_white.png")
        arrowbackicon.setAttribute("height", 0.22 * circleRadius)
        arrowbackicon.setAttribute("width", 0.22 * circleRadius)
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
            logo.setAttribute("radius", 0.2 * circleRadius)
            logo.setAttribute("material", {color: this.data.color, opacity: 1 })
            logo.setAttribute("position", "0 0 0.02")

            if(icon !== "" && icon !== undefined) {
                const logoicon = document.createElement("a-image")

                let myImg = new Image;
                myImg.src = icon;
                myImg.onload = function(){
                    logoicon.setAttribute("src", icon)
                    logoicon.setAttribute("height", 0.2 * circleRadius)
                    logoicon.setAttribute("width", 0.2 * circleRadius)
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
        document
            .querySelectorAll(".menu-item")
            .forEach((item, i) => {
                const parsedItem = this.items[i]
                const text = item.querySelector("a-text")
                const icon = item.querySelector("a-image")

                item.setAttribute("material", {color: parsedItem.color})
                text.setAttribute("color", parsedItem.textColor ?? this.data.color);
                icon?.setAttribute("src", `${parsedItem.icon}.png`)
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