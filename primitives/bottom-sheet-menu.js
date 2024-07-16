import '../components/bottomSheetMenu.js'

AFRAME.registerPrimitive('a-bottom-sheet-menu', {
    defaultComponents: {
        'geometry': { primitive: 'plane', height: 0.5, width: 1 },
        'bottom-sheet-menu': { },
    },

    mappings: {
        visible: 'bottom-sheet-menu.visible',
        color: 'bottom-sheet-menu.color',
        items: 'bottom-sheet-menu.items',
        title: 'bottom-sheet-menu.title',
    }
})

