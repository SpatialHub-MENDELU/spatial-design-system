import * as AFRAME from "aframe";

AFRAME.registerComponent("flex-col", {
    schema: {
        sm: { type: "number", default: 12 },
        md: { type: "number" },
        lg: { type: "number" },
        xl: { type: "number" },
        '2xl': { type: "number" },
        '3xl': { type: "number" },
    },

    init() {
        this.updateBreakpoint = this.updateBreakpoint.bind(this);
        window.addEventListener('resize', this.updateBreakpoint);
        this.updateBreakpoint();
    },

    updateBreakpoint() {
        const width = window.innerWidth;
        this.currentBreakpoint =
            width >= 1536 ? '3xl' :
                width >= 1280 ? '2xl' :
                    width >= 1024 ? 'xl' :
                        width >= 768 ? 'lg' :
                            width >= 640 ? 'md' : 'sm';

        this.el.emit('breakpoint-changed', { breakpoint: this.currentBreakpoint });
    },

    getCurrentColumn() {
        const result = this.data[this.currentBreakpoint] ||
            this.data.md ||
            this.data.lg ||
            this.data.xl ||
            this.data['2xl'] ||
            this.data['3xl'] ||
            this.data.sm;

        console.log("get current column", result)

        return result;
    }
});
