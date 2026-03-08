import * as AFRAME from "aframe"
import "aframe-troika-text";
import "../primitives/ar-divider.js" 

AFRAME.registerComponent("table", {
    schema: {
        opacity: { type: "number", default: 1},
        density: { type: "string", default: "default" },
        color: { type: "string", default: "black" },
        header: { type: "array", default: [] },
        rows: { 
            type: "string",
            default: "",
            parse: function (value) {
                if (Array.isArray(value)) return value;
                if (!value) return [];

                // Handle JSON input
                if (value.trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(value.replace(/'/g, '"'));
                        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
                            return parsed.map(row => typeof row === 'string' ? row.split(',').map(s => s.trim()) : row);
                        }
                        return parsed;
                    } catch (e) {
                        console.error("Table JSON parse failed:", e);
                    }
                }
                return value.split('|').map(row => row.split(',').map(s => s.trim()));
            }
        },
    },

    init() {
        this.createTable();
    },

    update(oldData) {
        // Skip the first update loop as init() handles initial setup
        if (Object.keys(oldData).length === 0) return;
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'opacity':
                    this.updateTableOpacity();
                    break;
                case 'color':
                    this.updateTableColor();
                    break;
                case 'header':
                case 'rows':
                case 'density':
                    this.createTable();
                    break;
                default:
                    break;
            }
        });
    },

    createTable() {
        this.el.innerHTML = "";

        const header = this.data.header;
        const rows = this.data.rows;
        
        let colCount = 0;
        if (header && header.length > 0) {
            colCount = header.length;
        } else if (rows && rows.length > 0) {
            colCount = Math.max(...rows.map(row => Array.isArray(row) ? row.length : 0));
        }

        const tableWidth = 1.5; 
        const colWidth = tableWidth / colCount;
        const rowHeight = this.data.density === "compact" ? 0.1 : 0.15;
        
        let currentY = 0;

        // Create header
        header.forEach((headerText, index) => {
            const x = (index * colWidth) - (tableWidth / 2) + (colWidth / 2);
            this.createCell(headerText, x, currentY, colWidth, true);
        });

        this.createDivider(currentY - (rowHeight / 2), tableWidth);
        
        currentY -= rowHeight;

        // Create Rows
        if (rows && rows.length > 0) {
            rows.forEach(row => {
                const rowData = Array.isArray(row) ? row : [];
                
                for (let i = 0; i < colCount; i++) {
                    const cellText = rowData[i] !== undefined ? String(rowData[i]) : "-";
                    const x = (i * colWidth) - (tableWidth / 2) + (colWidth / 2);
                    this.createCell(cellText, x, currentY, colWidth, false);
                }
                
                this.createDivider(currentY - (rowHeight / 2), tableWidth);
                
                currentY -= rowHeight;
            });
        }
    },

    createCell(text, x, y, width, isHeader) {
        const textEl = document.createElement("a-troika-text");
        textEl.setAttribute("value", text);
        textEl.setAttribute("position", `${x} ${y} 0.01`);
        textEl.setAttribute("align", "center");
        textEl.setAttribute("anchor", "center");
        textEl.setAttribute("max-width", width * 0.9);
        textEl.setAttribute("font-size", 0.06);
        textEl.setAttribute("color", this.data.color);
        textEl.setAttribute("fill-opacity", this.data.opacity);

        if (isHeader) {
            textEl.setAttribute("outline-width", 0.001); 
            textEl.setAttribute("outline-color", this.data.color);
            textEl.setAttribute("outline-opacity", this.data.opacity);
            // Implemented this way because ("font-weight", "bold") is not supported.
            // For bold text to work, a specific bold font must be provided.        
        }
        
        this.el.appendChild(textEl);
    },

    createDivider(y, width) {
        const divider = document.createElement("a-ar-divider");
        divider.setAttribute("position", `0 ${y} 0`);
        divider.setAttribute("length", width.toString());
        divider.setAttribute("opacity", this.data.opacity);
        divider.setAttribute("color", this.data.color)
        
        this.el.appendChild(divider);
    },

    updateTableOpacity() {
        const textEls = this.el.querySelectorAll("a-troika-text");
        textEls.forEach(el => el.setAttribute("fill-opacity", this.data.opacity));
        
        const dividers = this.el.querySelectorAll("a-ar-divider");
        dividers.forEach(el => el.setAttribute("opacity", this.data.opacity));
    },

    updateTableColor() {
        const textEls = this.el.querySelectorAll("a-troika-text");
        textEls.forEach(el => el.setAttribute("color", this.data.color));
        
        const dividers = this.el.querySelectorAll("a-ar-divider");
        dividers.forEach(el => el.setAttribute("color", this.data.color));
    }
})
