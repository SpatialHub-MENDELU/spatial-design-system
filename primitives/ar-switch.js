import '../components/switch.js'


AFRAME.registerPrimitive('a-ar-switch', {
    defaultComponents: {
        'switch': {},
    },
    mappings: {
        primary: 'switch.primary',
        opacity: 'geometry.opacity',
        visible: 'geometry.visible',
        position: 'geometry.position',
        size: 'switch.size',
        inset: 'switch.inset',
        variant: 'switch.variant',
        value: 'switch.value',
    }

});

