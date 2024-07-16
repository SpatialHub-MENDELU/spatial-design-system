import * as AFRAME from "aframe";

AFRAME.registerPrimitive('a-ar-row', {
    defaultComponents: {
        geometry: { primitive: 'plane' },
        material: { color: '#fff', opacity: 0.0 },
        grid: { rows: 1 }
    },

    mappings: {
        width: 'geometry.width',
        height: 'geometry.height',
        visible: 'geometry.visible',
        position: 'geometry.position',
        padding: 'grid.padding',
        opacity: 'material.opacity'
    }
})

AFRAME.registerPrimitive('a-ar-column', {
    defaultComponents: {
        geometry: { primitive: 'plane' },
        material: { color: '#fff', opacity: 0.0 },
        grid: { columns: 1 }
    },

    mappings: {
        width: 'geometry.width',
        height: 'geometry.height',
        visible: 'geometry.visible',
        position: 'geometry.position',
        padding: 'grid.padding',
        opacity: 'material.opacity'
    }
})

