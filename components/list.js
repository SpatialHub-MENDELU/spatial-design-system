import * as AFRAME from "aframe"
import "aframe-troika-text";
import { VARIANT_LIGHT_COLOR, determineHighlightedColor } from "../utils/colors";

AFRAME.registerComponent("list", {
    schema: {
        width: { type: "number", default: 1.5 },
        size: { type: "string", default: "medium"},
        opacity: { type: "number", default: 1 },
        textcolor: { type: "string", default: "black" },
        color: { type: "string", default: VARIANT_LIGHT_COLOR },
        type: { type: "string", default: "text" },
        items: { 
            default: [{ title: "Item", subtitle: "", icon: ""}],
            parse: function (value) {
                if (typeof value === 'string') {
                    try {
                        // Attempt to parse JSON string (e.g. '[{"title": "Item 1", "subtitle": "Subtitle", "icon": "/avatar.png"}]')
                        return JSON.parse(value.replace(/'/g, '"'));
                    } catch (e) {
                        // Fallback for simple comma-separated strings (e.g. "Item 1,Item 2")
                        return value.split(',').map(item => ({ title: item.trim(), subtitle: "", icon: "" }));
                    }
                }
                return value;
            },
            stringify: JSON.stringify
        },
    },

    init() {
        this.rows = [];
        this.selectedIndex = -1;
        this.setItems();
    },

    update(oldData) {
        if (Object.keys(oldData).length === 0) return;
        
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        
        changedProperties.forEach(property => {
            switch (property) {
                case 'width':
                case 'items':
                case 'type':
                case 'textcolor':
                case 'opacity':
                case 'size':
                case 'color':
                    this.setItems();
                    break;
                default:
                    break;
            }
        });
    },

    _clearItems() {
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
    },

    _appendText(parent, value, config) {
        const el = document.createElement("a-troika-text");
        el.setAttribute("value", value || "");
        el.setAttribute("align", config.align || "left");
        el.setAttribute("anchor", config.anchor || "left");
        el.setAttribute("baseline", config.baseline || "center");
        el.setAttribute("font-size", config.fontSize || 0.06);
        el.setAttribute("color", config.color || this.data.textcolor);

        if (config.clipRect) el.setAttribute("clip-rect", config.clipRect);
        if (config.position) el.setAttribute("position", config.position);
        if (config.maxWidth) el.setAttribute("max-width", config.maxWidth);
        if (config.lineHeight) el.setAttribute("line-height", config.lineHeight);
        if (config.opacity !== undefined) el.setAttribute("fill-opacity", config.opacity);

        parent.appendChild(el);
        return el;
    },

    setSize() {
        switch (this.data.size) {
        case "small":
            this.sizeCoef = 0.06;
            break;

        case "large":
            this.sizeCoef = 0.09;
            break;

        case "medium":
        default:
            this.sizeCoef = 0.075;
            break;
        }
  },

    getValidWidth() {
        let width = parseFloat(this.data.width);
        if (isNaN(width) || !isFinite(width) || width <= 0) {
            console.warn(`List width must be a positive number greater than 0. Using default of 1.5.`);
            return 1.5;
        }
        return width;
    },

    setItems() {
        this._clearItems();
        this.rows = [];
        this.selectedIndex = -1;

        if (this.data.type === "text") {
            this.createTextList();
        } else if (this.data.type === "card") {
            this.createCardList();
        }
    },

    createTextList() {
        const items = this.data.items;
        const width = this.getValidWidth();
        let currentY = 0;

        let sizeCoef = 1;
        if (this.data.size === "small") sizeCoef = 0.7;
        if (this.data.size === "large") sizeCoef = 1.5;

        // Create a wrapper entity to offset the items for centering
        const wrapper = document.createElement("a-entity");
        this.el.appendChild(wrapper);

        const letterWidthRatio = 0.55;
        let lastY = 0;

        items.forEach((item) => {
            const itemContainer = document.createElement("a-entity");
            
            // Layout constants matching card.js
            const titleFontSize = 0.075 * sizeCoef;
            const subtitleFontSize = 0.06 * sizeCoef;
            const subtitleOffset = 0.07 * sizeCoef;
            const itemPadding = 0.1 * sizeCoef; 
            
            let itemHeight = titleFontSize;

            // Add Title
            if (item.title) {
                this._appendText(itemContainer, item.title, {
                    fontSize: titleFontSize,
                    position: { x: 0, y: 0, z: 0 },
                    opacity: this.data.opacity,
                    clipRect: `0 -1 ${width} 1`
                });
            }

            // Add Subtitle
            if (item.title && item.subtitle) {
                const charWidth = subtitleFontSize * letterWidthRatio;
                const charsPerLine = Math.max(1, Math.floor(width / charWidth));
                const lines = Math.ceil(item.subtitle.length / charsPerLine);
                const subtitleHeight = lines * (subtitleFontSize * 1.2); // 1.2 is troika default line-height

                this._appendText(itemContainer, item.subtitle, {
                    fontSize: subtitleFontSize,
                    position: { x: 0, y: -subtitleOffset, z: 0 },
                    opacity: this.data.opacity * 0.8,
                    maxWidth: width,
                    lineHeight: 1.2,
                    baseline: "top"
                });
                
                itemHeight = subtitleOffset + subtitleHeight;
            }

            itemContainer.setAttribute("position", { x: 0, y: currentY, z: 0 });
            wrapper.appendChild(itemContainer);

            // Track the lowest Y position used by this item
            lastY = currentY - itemHeight;

            // Calculate height to offset the next list item
            currentY -= (itemHeight + itemPadding);
        });

        // Center the wrapper vertically and horizontally relative to the root entity
        const centerY = lastY / 2;
        wrapper.setAttribute("position", { x: 0, y: -centerY, z: 0 });
    },

    createCardList() {
        const items = this.data.items;
        const width = this.getValidWidth();
        let sizeCoef = this.data.size === "small" ? 0.7 : (this.data.size === "large" ? 1.5 : 1);

        const padding = 0.05 * sizeCoef;
        const itemPadding = 0.05 * sizeCoef; 
        
        // 1. Create the main column (the card body)
        const mainColumn = document.createElement("a-ar-column");
        mainColumn.setAttribute("width", width);
        mainColumn.setAttribute("material", "color", this.data.color);
        mainColumn.setAttribute("opacity", this.data.opacity);
        this.el.appendChild(mainColumn);

        // Pre-calculate heights to properly center items within the column background
        let itemHeights = [];
        let totalHeight = padding * 2; // Top and bottom padding
        
        const letterWidthRatio = 0.55;
        const contentWidth = width - (padding * 2);

        items.forEach((item) => {
            const titleFontSize = 0.075 * sizeCoef;
            const subtitleFontSize = 0.06 * sizeCoef;
            const subtitleOffset = 0.07 * sizeCoef;
            
            let subtitleHeight = 0;
            if (item.subtitle) {
                const charWidth = subtitleFontSize * letterWidthRatio;
                const charsPerLine = Math.max(1, Math.floor(contentWidth / charWidth));
                const lines = Math.ceil(item.subtitle.length / charsPerLine);
                subtitleHeight = lines * (subtitleFontSize * 1.2);
            }

            let itemHeight = item.subtitle ? (subtitleOffset + subtitleHeight + 0.05) : (titleFontSize + 0.1);
            
            itemHeights.push({
                height: itemHeight,
                titleFontSize,
                subtitleFontSize
            });
            totalHeight += itemHeight;
        });

        if (items.length > 1) {
            totalHeight += (items.length - 1) * itemPadding;
        }

        // Start positioning from the top of the column
        let currentY = (totalHeight / 2) - padding;

        items.forEach((item, index) => {
            // 2. Create Row for each item
            const row = document.createElement("a-ar-row");
            
            const heights = itemHeights[index];
            const itemHeight = heights.height;
            const itemCenterY = currentY - (itemHeight / 2);

            row.setAttribute("width", width);
            row.setAttribute("height", itemHeight);
            
            // Positioning within the column
            row.setAttribute("position", { x: 0, y: itemCenterY, z: 0.01 });
            
            // 3. Add Text (Positioned relative to the row's center)
            const textStartX = -(width / 2) + padding;
            const titleY = item.subtitle ? (itemHeight / 2) - (0.06 * sizeCoef) : 0;

            if (item.title) {
                this._appendText(row, item.title, {
                    fontSize: heights.titleFontSize,
                    position: { x: textStartX, y: titleY, z: 0.02 },
                    opacity: this.data.opacity
                });
            }

            if (item.subtitle) {
                const subtitleY = titleY - (0.04 * sizeCoef);
                this._appendText(row, item.subtitle, {
                    fontSize: heights.subtitleFontSize,
                    position: { x: textStartX, y: subtitleY, z: 0.02 },
                    opacity: this.data.opacity * 0.7,
                    maxWidth: contentWidth,
                    lineHeight: 1.2,
                    baseline: "top"
                });
            }

            // 4. Interaction
            row.classList.add("clickable");
            row.addEventListener("click", () => {
                this.selectedIndex = index;
                this._updateRowHighlights();
                this.el.emit("selected", { item, index });
            });

            mainColumn.appendChild(row);
            this.rows.push(row);

            currentY = itemCenterY - (itemHeight / 2) - itemPadding;
        });

        // Size the background to fit all rows
        mainColumn.setAttribute("height", totalHeight);
        
        // Center the whole list
        mainColumn.setAttribute("position", { x: 0, y: 0, z: 0 });
    },

    _updateRowHighlights() {
        const highlightedColor = determineHighlightedColor(this.data.color);
``
        this.rows.forEach((row, index) => {
            if (index === this.selectedIndex) {
                row.setAttribute("material", {
                    color: highlightedColor,
                    opacity: 1.0 // Make it solid when selected
                });
            } else {
                // Return to transparent background so the column color shows through
                row.setAttribute("material", {
                    opacity: 0.0 
                });
            }
        });
    }
});
