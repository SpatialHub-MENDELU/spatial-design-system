import * as AFRAME from "aframe";

// Named breakpoints in ascending order, with their default meter thresholds.
// The container's `customBreakpoints` overrides these thresholds positionally.
const BREAKPOINT_ORDER = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'];
const DEFAULT_THRESHOLDS = {
    sm: 0,    // default value
    md: 4,    // 4m
    lg: 7,    // 7m
    xl: 10,   // 10m
    '2xl': 12, // 12m
    '3xl': 15  // 15m
};

AFRAME.registerComponent("flex-col", {
    schema: {
        sm: { type: "number" },
        md: { type: "number" },
        lg: { type: "number" },
        xl: { type: "number" },
        '2xl': { type: "number" },
        '3xl': { type: "number" },
    },

    init() {
        this.updateBreakpoint = this.updateBreakpoint.bind(this);
        this.currentBreakpoint = 'sm';

        // Initialization
        this.el.sceneEl.addEventListener('loaded', () => {
            this.updateBreakpoint();

            // If the parent has a flexbox component, listen to its events
            if (this.el.parentEl && this.el.parentEl.components.flexbox) {
                this.el.parentEl.addEventListener('object3dset', this.updateBreakpoint);
                this.el.parentEl.addEventListener('componentchanged', (evt) => {
                    if (evt.detail.name === 'geometry' || evt.detail.name === 'width') {
                        this.updateBreakpoint();
                    }
                });
            }
        });
    },

    updateBreakpoint() {
        if (!this.el.parentEl) return;

        // Get the width of the parent ThreeJS object in meters
        let containerWidth = 0;

        if (this.el.parentEl.object3D) {
            // If the object has a bounding box, use it
            const bbox = new THREE.Box3().setFromObject(this.el.parentEl.object3D);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            containerWidth = size.x;
        } else {
            console.error('Flex-col: Parent element does not have a valid object3D');
        }

        // Get all available breakpoints (both predefined and custom)
        const breakpoints = this.getAvailableBreakpoints();
        
        // Find the best matching breakpoint
        this.currentBreakpoint = this.findBestBreakpoint(containerWidth, breakpoints);

        this.el.emit('breakpoint-changed', {
            breakpoint: this.currentBreakpoint,
            containerWidth: containerWidth
        });
    },

    // Resolve the meter threshold of each named breakpoint, applying the parent
    // flexbox container's customBreakpoints override (positional, ascending order).
    getThresholds() {
        const thresholds = { ...DEFAULT_THRESHOLDS };

        const parent = this.el.parentEl;
        const flexbox = parent && parent.components && parent.components.flexbox;
        if (flexbox && typeof flexbox.getCustomBreakpoints === 'function') {
            flexbox.getCustomBreakpoints().forEach((threshold, i) => {
                if (i < BREAKPOINT_ORDER.length) {
                    thresholds[BREAKPOINT_ORDER[i]] = threshold;
                }
            });
        }

        return thresholds;
    },

    getAvailableBreakpoints() {
        const breakpoints = [];
        const thresholds = this.getThresholds();

        for (const name of BREAKPOINT_ORDER) {
            // Only add if the breakpoint is actually defined in the data
            if (this.data[name] !== undefined && this.data[name] !== 0) {
                breakpoints.push({ name, threshold: thresholds[name], value: this.data[name] });
            }
        }

        // Sort by threshold descending (largest first)
        return breakpoints.sort((a, b) => b.threshold - a.threshold);
    },

    findBestBreakpoint(containerWidth, breakpoints) {
        // Find the largest breakpoint where containerWidth >= threshold
        for (const breakpoint of breakpoints) {
            if (containerWidth >= breakpoint.threshold) {
                return breakpoint.name;
            }
        }
        
        // If no breakpoint matches, return the smallest available one or 'sm' as fallback
        if (breakpoints.length > 0) {
            return breakpoints[breakpoints.length - 1].name;
        }
        
        return 'sm'; // Ultimate fallback
    },

    getCurrentColumn() {
        // Always recalculate the best breakpoint when this method is called
        let containerWidth = 0;
        if (this.el.parentEl && this.el.parentEl.object3D) {
            const bbox = new THREE.Box3().setFromObject(this.el.parentEl.object3D);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            containerWidth = size.x;
        }

        // Get only the breakpoints that are actually defined (not 0 or undefined)
        const breakpoints = this.getAvailableBreakpoints();
        
        // Find the largest breakpoint that is <= containerWidth
        // This ensures we only use breakpoints that should actually apply
        for (const breakpoint of breakpoints) {
            if (containerWidth >= breakpoint.threshold) {
                return breakpoint.value;
            }
        }
        
        // If no breakpoint applies (container is smaller than all defined breakpoints),
        // return undefined since no breakpoint should apply
        return undefined;
    },

    remove() {
        if (this.el.parentEl) {
            this.el.parentEl.removeEventListener('object3dset', this.updateBreakpoint);
        }
    }
});