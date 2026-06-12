# Spatial Design System

A set of reusable components and styles for AR and VR applications developed in A-FRAME.
Primary focus is on mobile AR but general guidelines are applicable and goggles.

<img src="https://sds.pisarovic.cz/showcase/elements.png" height="300" alt="Spatial Design System logo">
<img src="https://sds.pisarovic.cz/showcase/positioning.png" height="300"  alt="Spatial Design System logo">


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


## Running examples locally

The repository includes a set of interactive examples covering AR, VR, hands interaction, flexbox layout, game components, and more.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see the examples landing page. From there you can navigate to each example.