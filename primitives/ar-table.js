import '../components/table.js'

AFRAME.registerPrimitive('a-ar-table', {
    defaultComponents: {
        table: { },
    },
    
    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'table.opacity',
        header: 'table.header',
        rows: 'table.rows',
        density: 'table.density',
        color: 'table.color',

    }
})
