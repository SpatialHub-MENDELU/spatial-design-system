import '../components/card.js'

AFRAME.registerPrimitive('a-ar-card', {
    defaultComponents: {
        card: { },
    },

    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'card.opacity',
        mode: 'card.mode',
        color: 'card.color',
        textcolor: 'card.textcolor',
        title: 'card.title',
        subtitle: 'card.subtitle',
        content: 'card.content',
        prependicon: 'card.prependicon',
        appendicon: 'card.appendicon',
        buttons: 'card.buttons',
        outlined: 'card.outlined',
        image: 'card.image',
    }
})
