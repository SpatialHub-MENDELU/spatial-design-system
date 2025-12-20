import '../components/dialog.js'

AFRAME.registerPrimitive('a-ar-dialog', {
    defaultComponents: {
        dialog: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'dialog.opacity',
        color: 'dialog.color',
        mode: 'dialog.mode',
        textcolor: 'dialog.textcolor',
        prependicon: 'dialog.prependicon',
        closingicon: 'dialog.closingicon',
        title: 'dialog.title',
        content: 'dialog.content',
        buttons: 'dialog.buttons',
        persistent: 'dialog.persistent',
        transition: 'dialog.transition',
    }
})