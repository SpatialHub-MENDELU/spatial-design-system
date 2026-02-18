import '../components/button-toggle.js'

AFRAME.registerPrimitive('a-ar-buttontoggle', {
    defaultComponents: {
        buttontoggle: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        size: 'buttontoggle.size',
        opacity: 'buttontoggle.opacity',
        color: 'buttontoggle.color',
        mode: 'buttontoggle.mode',
        buttons: 'buttontoggle.buttons',
        mandatory: 'buttontoggle.mandatory',
        multiple: 'buttontoggle.multiple',
        rounded: 'buttontoggle.rounded',
        tile: 'buttontoggle.tile',
    }
})
