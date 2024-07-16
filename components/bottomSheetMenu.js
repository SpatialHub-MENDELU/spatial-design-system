import * as AFRAME from "aframe";

AFRAME.registerComponent('bottom-sheet-menu', {
    schema: {
        visible: {type: 'boolean', default: false},
        items: {type: 'string', default: ''},
        title: {type: 'string', default: ''},
    },
    bottomSheetEl: undefined,
    init() {
        const scene = this.el.sceneEl
        const renderer = scene.renderer
        const controller = renderer.xr.getController( 0 );

        // hide the AR element because bottom sheet menu is rendered using standard HTML
        this.el.object3D.visible = false

        this.bottomSheetEl = document.querySelector('#bottom-sheet')
        this.bottomSheetTitleEl = document.querySelector('#bottom-sheet-title')
        this.bottomSheetContentEl = document.querySelector('#bottom-sheet-content')

        const parsedItems = JSON.parse(this.data.items.replaceAll("'", "\""))
        parsedItems.sort((a, b) => a.bottomSheetOrder - b.bottomSheetOrder)

        // Contents
        this.bottomSheetTitleEl.innerText = this.data.title

        for (const item of parsedItems) {
            const div = document.createElement('div')
            div.classList.add('bottom-sheet-item')
            div.addEventListener('click', () => {
                div.classList.add('selected')
                this.el.emit('select', {item: item})
            })

            const textDiv = document.createElement('div')
            textDiv.classList.add('bottom-sheet-item-text')
            textDiv.innerText = item.title
            div.appendChild(textDiv)

            const icon = document.createElement('img')
            icon.src = item.icon + '.png'
            icon.classList.add('bottom-sheet-item-icon')
            if (item.color) icon.style.backgroundColor = item.color

            div.prepend(icon)

            this.bottomSheetContentEl.appendChild(div)
        }

        // Interactions
        // document.body
        //     .addEventListener('click', () => {
        //         // standard document clicking available only on non-ar devices
        //         const supportsAr = document.querySelector('.a-enter-ar:not(.a-hidden)') !== null
        //         if (!supportsAr) this.showMenu()
        //     }, true)
        // controller
        //     .addEventListener('select', () => this.showMenu())
        document.querySelector("#bottom-sheet-close")
            .addEventListener('click', () => this.hideMenu())

        this.el.addEventListener('show', () => this.showMenu())
        this.el.addEventListener('hide', () => this.hideMenu())
        this.el.addEventListener('reset-selection', () => this.resetSelection())
    },
    showMenu() {
        this.el.classList.add('open')
        this.bottomSheetEl.classList.add('open')
    },
    hideMenu() {
        this.el.classList.remove('open')
        this.bottomSheetEl.classList.remove('open')
    },
    resetSelection() {
        document.querySelectorAll(".bottom-sheet-item")
            .forEach((item) => item.classList.remove('selected'))
    },
})