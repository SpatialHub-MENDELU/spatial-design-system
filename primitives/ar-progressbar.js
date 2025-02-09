import '../components/progressBar.js'

AFRAME.registerPrimitive('a-ar-progressbar', {
    defaultComponents: {
        progressBar: { },
    },

    mappings: {
        visible: 'geometry.visible',
        position: 'geometry.position',
        opacity: 'progressBar.opacity',
        primary: 'progressBar.primary',
        variant: 'progressBar.variant',
        state: 'progressBar.state',
        size: 'progressBar.size',
        value: 'progressBar.value',
        textvisibility: 'progressBar.textvisibility',
        textcolor: 'progressBar.textcolor',
        rounded: 'progressBar.rounded',
        reversed: 'progressBar.reversed',
    }
})
