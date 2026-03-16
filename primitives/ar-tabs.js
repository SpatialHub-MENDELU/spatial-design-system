import '../components/tabs.js'

AFRAME.registerPrimitive('a-ar-tabs', {
    defaultComponents: {
        tabs: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        tabsbuttons: 'tabs.tabsbuttons',
        opacity: 'tabs.opacity',
        size: 'tabs.size',
        color: 'tabs.color',
        activecolor: 'tabs.activecolor',
        mode: 'tabs.mode',

    }
})
