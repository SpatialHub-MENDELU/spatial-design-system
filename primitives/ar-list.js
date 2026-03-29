import * as AFRAME from "aframe";
import '../components/list.js';

AFRAME.registerPrimitive('a-ar-list', {
    defaultComponents: {
        list: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        size: 'list.size',
        width: 'list.width',
        opacity: 'list.opacity',
        textcolor: 'list.textcolor',
        color: 'list.color',
        items: 'list.items',
        type: 'list.type'
    }
})

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
        opacity: 'material.opacity',
        color: 'material.color'
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
        opacity: 'material.opacity',
        color: 'material.color'
    }
})
