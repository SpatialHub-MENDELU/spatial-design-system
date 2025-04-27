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
        this.currentBreakpoint = 'sm';

        // Inicializace
        this.el.sceneEl.addEventListener('loaded', () => {
            this.updateBreakpoint();

            // Pokud má rodič flexbox komponentu, poslouchejme na její události
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

        // Získání šířky rodičovského ThreeJS objektu v metrech
        let containerWidth = 0;

        // Pokud má rodič komponentu width, použijeme ji
        if (this.el.parentEl.hasAttribute('width')) {
            containerWidth = parseFloat(this.el.parentEl.getAttribute('width'));
        }
        // Jinak zkusíme získat šířku z geometrie
        else if (this.el.parentEl.object3D) {
            // Pokud má objekt bounding box, použijeme ho
            const bbox = new THREE.Box3().setFromObject(this.el.parentEl.object3D);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            containerWidth = size.x;
        }

        // Pokud nemáme validní šířku, použijeme výchozí breakpoint
        if (!containerWidth || isNaN(containerWidth)) {
            this.currentBreakpoint = 'sm';
            return;
        }

        // Určení breakpointu podle šířky rodičovského kontejneru v metrech
        // Použijeme menší hodnoty, protože pracujeme s metry, ne pixely
        this.currentBreakpoint =
            containerWidth >= 15 ? '3xl' :  // 15m ~ 1500px
                containerWidth >= 12 ? '2xl' :  // 12m ~ 1200px
                    containerWidth >= 10 ? 'xl' :   // 10m ~ 1000px
                        containerWidth >= 7 ? 'lg' :    // 7m ~ 700px
                            containerWidth >= 4 ? 'md' :    // 4m ~ 400px
                                'sm';                          // výchozí hodnota

        // Emitování události změny breakpointu
        this.el.emit('breakpoint-changed', {
            breakpoint: this.currentBreakpoint,
            containerWidth: containerWidth
        });
    },

    getCurrentColumn() {
        // Vrácení aktuální hodnoty sloupce podle breakpointu
        // Fallback na nižší breakpointy, pokud aktuální není definován
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
        // Vyčištění posluchačů událostí
        if (this.el.parentEl) {
            this.el.parentEl.removeEventListener('object3dset', this.updateBreakpoint);
        }
    }
});