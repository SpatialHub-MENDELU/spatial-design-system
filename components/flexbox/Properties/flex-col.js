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

        // Determine the breakpoint based on the width of the parent container in meters
        this.currentBreakpoint =
            containerWidth >= 15 && this.data['3xl'] ? '3xl' :  // 15m ~ 1500px
                containerWidth >= 12 && this.data['2xl'] ? '2xl' :  // 12m ~ 1200px
                    containerWidth >= 10 && this.data.xl ? 'xl' :   // 10m ~ 1000px
                        containerWidth >= 7 && this.data.lg ? 'lg' :    // 7m ~ 700px
                            containerWidth >= 4 && this.data.md ? 'md' :    // 4m ~ 400px
                                'sm';                          // default value

        this.el.emit('breakpoint-changed', {
            breakpoint: this.currentBreakpoint,
            containerWidth: containerWidth
        });
    },

    getCurrentColumn() {
        const result = this.data[this.currentBreakpoint] ||
            this.data.md ||
            this.data.lg ||
            this.data.xl ||
            this.data['2xl'] ||
            this.data['3xl'] ||
            this.data.sm;

        return result;
    },

    remove() {
        if (this.el.parentEl) {
            this.el.parentEl.removeEventListener('object3dset', this.updateBreakpoint);
        }
    }
});