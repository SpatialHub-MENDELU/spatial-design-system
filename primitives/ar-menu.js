import '../components/menu.js'

AFRAME.registerPrimitive('a-ar-menu', {
  defaultComponents: {
    geometry: { primitive: 'circle', segments: 128},
    menu: { size: 'medium', items: [] },
  },

  mappings: {
    visible: 'geometry.visible',
    size: 'menu.size',
    menuopacity: 'menu.menuopacity',
    itemsopacity: 'menu.itemsopacity',
    position: 'geometry.position',
    color: 'menu.color',
    highlighted: 'menu.highlighted',
    highlight: 'menu.highlight',
    items: 'menu.items',
    variant: 'menu.variant',
    layout: 'menu.layout',
    logoicon: 'menu.logoicon',
    textsize: 'menu.textsize',
    iconsize: 'menu.iconsize',
    backbutton: 'menu.backbutton',
    showtext: 'menu.showtext',
  }

})
