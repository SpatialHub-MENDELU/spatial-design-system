import '../components/avatar.js'

AFRAME.registerPrimitive('a-ar-avatar', {
    defaultComponents: {
        avatar: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        size: 'avatar.size',
        opacity: 'avatar.opacity',
        color: 'avatar.color',
        textcolor: 'avatar.textcolor',
        initial: 'avatar.initial',
        icon: 'avatar.icon',
        image: 'avatar.image',
        tile: 'avatar.tile',
        rounded: 'avatar.rounded',

    }
})
