export function doesGLTFAnimationExist(model, animationName) {
    const animations = model.animations || model.scene?.animations;

    if (!animations || animations.length === 0) {
        console.error('The model does not contain any animations.');
        return false;
    }

    const exists = animations.some((clip) => {
        if (animationName.includes('*')) {
            const pattern = new RegExp('^' + animationName.replace(/\*/g, '.*') + '$');
            return pattern.test(clip.name);
        } else {
            return clip.name === animationName;
        }
    });


    if (!exists) {
        console.error(`The animation "${animationName}" was not found in the model. Available animations: ${animations.map((clip) => clip.name).join(', ')}`);
        return false;
    }

    return true;
}

export function isPositiveNumber(input, name){
    if (input <= 0) {
        console.error(`Property "${name}" is not a positive number: ${input}`);
        return false;
    }
    return true;
}

export function isValidGameKey(key) {
    const validKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'control', 'tab',
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ];
    const keyLower = key.toLowerCase();
    if (!validKeys.includes(keyLower)) {
        console.error(`Invalid key: "${keyLower}". Valid keys are: ${validKeys.join(', ')}`);
        return false;
    }
    return true
}