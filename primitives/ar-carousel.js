import '../components/carousel.js'

AFRAME.registerPrimitive('a-ar-carousel', {
    defaultComponents: {
        carousel: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        width: 'carousel.width',
        height: 'carousel.height',
        opacity: 'carousel.opacity',
        images: 'carousel.images',
        arrows: 'carousel.arrows',
        custombuttons: 'carousel.custombuttons',
        previous: 'carousel.previous',
        next: 'carousel.next',

    }
})
