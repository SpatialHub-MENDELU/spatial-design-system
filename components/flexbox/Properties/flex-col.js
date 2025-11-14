import * as AFRAME from "aframe";

AFRAME.registerComponent("flex-col", {
    schema: {
        sm: { type: "number" },
        md: { type: "number" },
        lg: { type: "number" },
        xl: { type: "number" },
        '2xl': { type: "number" },
        '3xl': { type: "number" },
    },

    // Override parse to handle custom numeric breakpoints
    parse(value) {
        const data = {};
        
        if (typeof value === 'string') {
            // Parse string like "sm: 4; md: 6; 5.5: 8"
            const pairs = value.split(';').map(s => s.trim()).filter(s => s);
            
            for (const pair of pairs) {
                const [key, val] = pair.split(':').map(s => s.trim());
                if (key && val) {
                    // Check if key is a number or predefined breakpoint
                    if (!isNaN(parseFloat(key)) || ['sm', 'md', 'lg', 'xl', '2xl', '3xl'].includes(key)) {
                        const numValue = parseFloat(val);
                        if (!isNaN(numValue)) {
                            data[key] = numValue;
                        }
                    }
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            // Handle object format
            for (const [key, val] of Object.entries(value)) {
                if (!isNaN(parseFloat(key)) || ['sm', 'md', 'lg', 'xl', '2xl', '3xl'].includes(key)) {
                    const numValue = parseFloat(val);
                    if (!isNaN(numValue)) {
                        data[key] = numValue;
                    }
                }
            }
        }
        
        return data;
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

    getAvailableBreakpoints() {
        const breakpoints = [];
        
        const predefinedBreakpoints = {
            '3xl': 15,  // 15m 
            '2xl': 12,  // 12m 
            'xl': 10,   // 10m 
            'lg': 7,    // 7m 
            'md': 4,    // 4m 
            'sm': 0     // default value
        };
        
        for (const [name, threshold] of Object.entries(predefinedBreakpoints)) {
            // Only add if the breakpoint is actually defined in the data
            if (this.data[name] !== undefined && this.data[name] !== 0) {
                breakpoints.push({ name, threshold, value: this.data[name] });
            }
        }
        
        // Add custom numeric breakpoints ONLY if they are actually defined
        for (const [key, value] of Object.entries(this.data)) {
            if (!isNaN(parseFloat(key)) && value !== undefined && value !== 0) {
                const threshold = parseFloat(key);
                breakpoints.push({ name: key, threshold, value });
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