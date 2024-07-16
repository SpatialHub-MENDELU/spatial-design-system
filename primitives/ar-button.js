import '../components/button.js'

AFRAME.registerPrimitive('a-ar-button', {
    defaultComponents: {
        button: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'button.opacity',
        primary: 'button.primary',
        size: 'button.size',
        content: 'button.text',
        icon: 'button.icon',
        iconpos: 'button.iconpos',
        textcolor: 'button.textcolor',
        variant: 'button.variant',
        uppercase: 'button.uppercase',
        rounded: 'button.rounded',
        textonly: 'button.textonly',
        outlined: 'button.outlined',

    }
})