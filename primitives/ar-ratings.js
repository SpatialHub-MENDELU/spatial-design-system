import '../components/ratings.js'

AFRAME.registerPrimitive('a-ar-ratings', {
    defaultComponents: {
        ratings: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'ratings.opacity',
        color: 'ratings.color',
        activecolor: 'ratings.activecolor',
        size: 'ratings.size',
        length: 'ratings.length',
        value: 'ratings.value',
        readonly: 'ratings.readonly',
        clearable: 'ratings.clearable',

    }
})
