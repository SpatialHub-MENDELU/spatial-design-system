import '../components/dialog.js'

AFRAME.registerPrimitive('a-ar-dialog', {
    defaultComponents: {
        dialog: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'dialog.opacity',
        primary: 'dialog.primary',
        variant: 'dialog.variant',
        textcolor: 'dialog.textcolor',
        prependicon: 'dialog.icon',
        closingicon: 'dialog.close',
        title: 'dialog.title',
        content: 'dialog.content',
        buttons: 'dialog.buttons',
        persistent: 'dialog.persistent',
        autoclose: 'dialog.autoclose',
        seamless: 'dialog.seamless',
        backdropfilter: 'dialog.backdropfilter',
        transition: 'dialog.transition',
    }
})