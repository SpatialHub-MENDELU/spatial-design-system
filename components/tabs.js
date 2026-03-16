import * as AFRAME from "aframe"
import "aframe-troika-text";
import { PRIMARY_COLOR_DARK, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import "../primitives/ar-button-toggle.js" 

AFRAME.registerComponent("tabs", {
    schema: {
        tabsbuttons: {
            default: [],
            parse: function (value) {
                if (Array.isArray(value)) return value;

                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value.replace(/'/g, '"'));
                    } catch (e) {
                        return value.split(',').map(l => ({ label: l.trim(), content: '' }));
                    }
                }
                return value;
            },
            stringify: JSON.stringify
        },
        opacity: { type: "number", default: 1},
        size: { type: "string", default: "medium" },
        color: { type: "string", default: VARIANT_LIGHT_COLOR },
        activecolor: { type: "string", default: PRIMARY_COLOR_DARK },
        mode: { type: "string", default: "" },
    },

    init() {
        this.buttonToggleEl = null;
        this.setTabs();
    },

    update(oldData) {
        // Skip if this is the first run (handled by init)
        if (!oldData || Object.keys(oldData).length === 0) return;

        // Check specifically for things that require a full rebuild
        if (this.data.tabsbuttons !== oldData.tabsbuttons || this.data.size !== oldData.size) {
            this.setTabs();
            return;
        }

        // For other properties, update the child primitive directly
        if (this.buttonToggleEl) {
            if (this.data.color !== oldData.color) this.buttonToggleEl.setAttribute('color', this.data.color);
            if (this.data.activecolor !== oldData.activecolor) this.buttonToggleEl.setAttribute('activecolor', this.data.activecolor);
            if (this.data.opacity !== oldData.opacity) this.buttonToggleEl.setAttribute('opacity', this.data.opacity);
            if (this.data.mode !== oldData.mode) this.buttonToggleEl.setAttribute('mode', this.data.mode);
        }
    },

    setTabs() {
        if (this.buttonToggleEl) {
            this.el.removeChild(this.buttonToggleEl);
        }

        this.buttonToggleEl = document.createElement("a-ar-buttontoggle");
        this.buttonToggleEl.setAttribute("buttons", JSON.stringify(this.data.tabsbuttons));
        
        this.buttonToggleEl.setAttribute("size", this.data.size);
        this.buttonToggleEl.setAttribute("color", this.data.color);
        this.buttonToggleEl.setAttribute("activecolor", this.data.activecolor);
        this.buttonToggleEl.setAttribute("mode", this.data.mode);
        this.buttonToggleEl.setAttribute("opacity", this.data.opacity);
        
        this.buttonToggleEl.setAttribute("mandatory", true);
        this.buttonToggleEl.setAttribute("multiple", false);

        // Listen for the change event
        this.buttonToggleEl.addEventListener("change", (evt) => {
            // evt.detail.value will be the single object since multiple=false
            const activeTab = evt.detail.value;
            this.updateContentVisibility(activeTab);
        });

        this.el.appendChild(this.buttonToggleEl);

        // Setup initial visibility after the scene is ready
        if (this.el.sceneEl.hasLoaded) {
            this.updateContentVisibility(this.data.tabsbuttons[0]);
        } else {
            this.el.sceneEl.addEventListener('loaded', () => {
                this.updateContentVisibility(this.data.tabsbuttons[0]);
            });
        }
    },

    updateContentVisibility(activeTab) {
        if (!activeTab || !this.data.tabsbuttons) return;

        this.data.tabsbuttons.forEach(tab => {
            if (!tab.content) return;
            
            // Find the entity mentioned in the 'content' field
            const targetEl = document.querySelector(tab.content);
            if (targetEl) {
                // If this tab's content matches the active tab's content, show it
                const isVisible = tab.content === activeTab.content;
                targetEl.setAttribute("visible", isVisible);
            }
        });
    }
});
