import '../components/chip.js'

AFRAME.registerPrimitive('a-ar-chip', {
    defaultComponents: {
        chip: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        size: 'chip.size',
        opacity: 'chip.opacity',
        color: 'chip.color',
        mode: 'chip.mode',
        label: 'chip.label',
        textcolor: 'chip.textcolor',
        icon: 'chip.icon',
        iconpos: 'chip.iconpos',
        rounded: 'chip.rounded',
        outlined: 'chip.outlined',
        elevated: 'chip.elevated',
        textonly: 'chip.textonly',
        closable: 'chip.closable',

    }
})
