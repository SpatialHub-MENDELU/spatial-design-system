import '../components/textbox.js'
import '../components/virtualKeyboard.js'

AFRAME.registerPrimitive('a-ar-textbox', {
    defaultComponents: {
      textbox: {},
      virtualKeyboard: {},

    },
  
    mappings: {
      primary: 'textbox.primary',
      visible: 'geometry.visible',
      position: 'geometry.position',
      size: 'textbox.size',
      bordercolor: 'textbox.bordercolor',
      textcolor: 'textbox.textcolor',
      label: 'textbox.label',
      isactivated: 'textbox.isactivated',
      variant: 'textbox.variant',
    }
  });

  