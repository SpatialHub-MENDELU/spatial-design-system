import * as AFRAME from "aframe"
import "aframe-troika-text";

AFRAME.registerComponent("list", {
    schema: {
        width: { type: "number", default: 1.5 },
        size: { type: "string", default: "medium"},
        opacity: { type: "number", default: 1 },
        textcolor: { type: "string", default: "black" },
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

    setItems() {
        this._clearItems();

        if (this.data.type === "text") {
            this.createTextList();
        } else if (this.data.type === "card") {
            this.createCardList();
        }
    },

    createTextList() {
        const items = this.data.items;
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
                    clipRect: `0 -1 ${this.data.width} 1`
                });
            }

            // Add Subtitle
            if (item.title && item.subtitle) {
                const charWidth = subtitleFontSize * letterWidthRatio;
                const charsPerLine = Math.max(1, Math.floor(this.data.width / charWidth));
                const lines = Math.ceil(item.subtitle.length / charsPerLine);
                const subtitleHeight = lines * (subtitleFontSize * 1.2); // 1.2 is troika default line-height

                this._appendText(itemContainer, item.subtitle, {
                    fontSize: subtitleFontSize,
                    position: { x: 0, y: -subtitleOffset, z: 0 },
                    opacity: this.data.opacity * 0.8,
                    maxWidth: this.data.width,
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
        wrapper.setAttribute("position", { x: -this.data.width / 2, y: -centerY, z: 0 });
    },

    createCardList() {
        // Future card logic goes here...
    },
});
