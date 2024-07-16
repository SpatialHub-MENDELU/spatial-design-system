# Spatial Design System

A set of reusable components and styles for AR and VR applications developed in A-FRAME.
Primary focus is on mobile AR but general guidelines are applicable and goggles.

## Documentation

See our [documentation web](https://sds.spatialhub.cz) with description of all components and also tutorials how to make things running. 
It also includes how to combine our library with _Vue_.


## Getting started

You must use a package manager and a build system like _Vite_ to use our library. Other options are not available yet.

Install our package via npm:

```bash
npm install spatial-design-system
```

In your javascript file, like _main.js_, import components you want to use. 
For example, import _ar-button_ primitive and billboard component that is a part of _position.js_:

```js
import "spatial-design-system/primitives/ar-button.js";
import "spatial-design-system/components/position.js";
```

Use it in your A-FRAME scene:

```html
<a-ar-button
        position="0 1.6 -3"
        size="medium"
        content="Click me"
        uppercase=true
        rounded=true
        outlined=true
        billboard
></a-ar-button>
```


## Example project

See an example minimalistic _Vite_ project with _A-FRAME_ and _Spatial Design System_ installed. 

1. Go to folder `example-project`
2. Run `npm install`.
3. Run `npm run dev`. 
4. Open the displayed link in browser. 
5. You should see a green button. Move left and right and the button will be always facing the user thanks to the _billboard_ component.