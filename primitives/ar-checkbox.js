import '../components/checkbox.js'

AFRAME.registerPrimitive('a-ar-checkbox', {
    defaultComponents: {
        checkbox: {},
    },
    
    mappings: {
        primary: 'checkbox.primary',
        visible: 'geometry.visible',
        position: 'geometry.position',
        size: 'checkbox.size',
        variant: 'checkbox.variant',
        value: 'checkbox.value',
    }
})