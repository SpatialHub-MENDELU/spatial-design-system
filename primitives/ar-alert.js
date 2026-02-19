import '../components/alert.js'

AFRAME.registerPrimitive('a-ar-alert', {
    defaultComponents: {
        alert: { },
    },

    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'alert.opacity',
        state: 'alert.state',
        mode: 'alert.mode',
        color: 'alert.color',
        textcolor: 'alert.textcolor',
        title: 'alert.title',
        content: 'alert.content',
        prependicon: 'alert.prependicon',
        closable: 'alert.closable',
        outlined: 'alert.outlined',
    }
})
