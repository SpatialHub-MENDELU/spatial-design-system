import '../components/divider.js'

AFRAME.registerPrimitive('a-ar-divider', {
    defaultComponents: {
        divider: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'divider.opacity',
        color: 'divider.color',
        length: 'divider.length',
        thickness: 'divider.thickness',
        vertical: 'divider.vertical',
    }
})
