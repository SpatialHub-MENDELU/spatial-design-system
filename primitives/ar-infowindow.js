import '../components/infowindow.js'

AFRAME.registerPrimitive('a-ar-infowindow', {
    defaultComponents: {
      'infowindow': {}
    },
    mappings: {
      isVisible: 'infowindow.isVisible',
      content: 'infowindow.content',
      startposition: 'infowindow.startposition',
      targetposition: 'infowindow.targetposition',
      duration: 'infowindow.duration',
      height: 'infowindow.height',
      width: 'infowindow.width',
      textcolor: 'infowindow.textcolor',
      primary: 'infowindow.primary',
    }
  });