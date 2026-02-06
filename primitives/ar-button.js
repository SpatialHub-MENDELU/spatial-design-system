import '../components/button.js'

AFRAME.registerPrimitive('a-ar-button', {
    defaultComponents: {
        button: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'button.opacity',
        color: 'button.color',
        size: 'button.size',
        content: 'button.text',
        icon: 'button.icon',
        iconpos: 'button.iconpos',
        textcolor: 'button.textcolor',
        mode: 'button.mode',
        uppercase: 'button.uppercase',
        rounded: 'button.rounded',
        roundedsides: 'button.roundedsides',
        textonly: 'button.textonly',
        outlined: 'button.outlined',
        elevated: 'button.elevated',
        tile: 'button.tile',

    }
})