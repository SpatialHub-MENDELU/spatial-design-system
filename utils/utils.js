export function isObjectTrulyVisible(el) {
    if (!el.visible) return false;

    while (el.parent) {
        el = el.parent;
        if (!el.visible) return false;
    }

    return true;
}

export function getAllObjects(scene) {
    const objects = []
    scene.traverse( node => {
        if( node.isMesh){
            objects.push( node )
        }
    })
    return objects
}

export function arLog(text) {
    document.getElementById("log").innerHTML = text + "<br>" + document.getElementById("log").innerHTML
}
export function stringifyForHTML(obj) {
    return JSON.stringify(obj).replaceAll("\"", "'")
}

export function createRoundedSquareShape(size, borderRadius) {
    const shape = new THREE.Shape();
    shape.moveTo(-size + borderRadius, -size);
    shape.lineTo(size - borderRadius, -size);
    shape.quadraticCurveTo(size, -size, size, -size + borderRadius);
    shape.lineTo(size, size - borderRadius);
    shape.quadraticCurveTo(size, size, size - borderRadius, size);
    shape.lineTo(-size + borderRadius, size);
    shape.quadraticCurveTo(-size, size, -size, size - borderRadius);
    shape.lineTo(-size, -size + borderRadius);
    shape.quadraticCurveTo(-size, -size, -size + borderRadius, -size);
    return shape;
}

export function createRoundedRectShape(width, height, radius) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2 + radius, -height / 2);
    shape.lineTo(width / 2 - radius, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
    shape.lineTo(width / 2, height / 2 - radius);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
    shape.lineTo(-width / 2 + radius, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
    shape.lineTo(-width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
    return shape;
}

function rgbToGrayscale(r, g, b) {
    // The most commonly used conversion formula
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Get the RGB array value of a color using css
function getRGBArray(colorName) {
    const tempElem = document.createElement("div");
    
    tempElem.style.color = colorName;

    document.body.appendChild(tempElem);
    const rgb = window.getComputedStyle(tempElem).color.match(/\d+/g).map(Number);
    document.body.removeChild(tempElem);

    return rgb;
}

export function getContrast(color1, color2) {
    const rgb1 = getRGBArray(color1)
    const rgb2 = getRGBArray(color2)
    const grayscale1 = rgbToGrayscale(rgb1[0], rgb1[1], rgb1[2]);
    const grayscale2 = rgbToGrayscale(rgb2[0], rgb2[1], rgb2[2]);

    const contrast = Math.abs(grayscale1 - grayscale2);
    
    return contrast;
}

export function setContrastColor(color) {
    return getContrast(color, "black") > getContrast(color, "white") ? 'black' : 'white';
}