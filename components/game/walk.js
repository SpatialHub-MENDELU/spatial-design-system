AFRAME.registerComponent("walk", {
    schema: {
        walkClipName: {type: "string", default: "Walk"},
        idleClipName: {type: "string", default: "Idle"},
        gallopClipName: {type: "string", default: "Gallop"},

        keyUp: {type: "string", default: "w"},
        keyDown: {type: "string", default: "s"},
        keyLeft: {type: "string", default: "a"},
        keyRight: {type: "string", default: "d"},

        speed: {type: "number", default: 4},
        sprint: {type: "boolean", default: true},
        sprintSpeed: {type: "number", default: 8},
        rotationSpeed: {type: "number", default: 90},

        turnType: {type: "string", default: "smoothTurn"}
    },

    init() {
        // GENERAL
        this.characterModel = this.el.children[0];
        this.turnType = this.data.turnType
        this.animations = {
            walk: this.data.walkClipName,
            idle: this.data.idleClipName,
            sprint: this.data.gallopClipName
        };

        this.keys = {
            up: this.data.keyUp,
            down: this.data.keyDown,
            left: this.data.keyLeft,
            right: this.data.keyRight
        };

        this.speed = this.data.speed;
        this.sprintEnabled = this.data.sprint;
        this.isSprinting = false;

        this.crossFadeDuration = 0.2

        // SMOOTH WALKING
        this.turnDirection = null;
        this.movingForward = false;
        this.movingBackward = false;
        this.rotationSpeed = this.data.rotationSpeed;
        this.currentRotation = 0;

        this.setAnimation(this.animations.idle);
        this.bindEvents();

    },

    bindEvents() {
        document.addEventListener("keydown", this.onKeyDown.bind(this));
        document.addEventListener("keyup", this.onKeyUp.bind(this));
    },

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === this.keys.left) this.turnDirection = 'left';
        if (key === this.keys.right) this.turnDirection = 'right';
        if (key === this.keys.up) this.movingForward = true;
        if (key === this.keys.down) this.movingBackward = true;

        if(this.sprintEnabled) if (key === 'shift' && this.movingForward) this.isSprinting = true;
    },

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === this.keys.left && this.turnDirection === 'left') this.turnDirection = null;
        if (key === this.keys.right && this.turnDirection === 'right') this.turnDirection = null;
        if (key === this.keys.up) this.movingForward = false;
        if (key === this.keys.down) this.movingBackward = false;

        if(this.sprintEnabled) {
            if (key === 'shift') this.isSprinting = false
            if (this.isSprinting && !this.movingForward) this.isSprinting = false;
        }

    },

    setAnimation(name) {
        if (!this.characterModel || this.currentAnimation === name) return;
        this.characterModel.setAttribute('animation-mixer', {
            clip: name,
            crossFadeDuration: this.crossFadeDuration
        });
        this.currentAnimation = name;
    },


    tick(time, deltaTime) {
        const deltaSec = deltaTime / 1000;

        if (this.el.body) {
            this.setMoving(deltaSec)
        }
    },

    setMoving(deltaSec) {

       if(this.sprintEnabled){
            if(this.turnDirection) {
                if(this.isSprinting && this.movingForward) this.setAnimation(this.animations.sprint)
                if(!this.movingForward) this.setAnimation(this.animations.walk)
            }
            this.isSprinting ? this.startSprinting() : this.stopSprinting();
        }

        if(this.movingForward || this.movingBackward) {
            this.move(this.movingForward)
            if(this.movingForward || this.movingBackward) this.setAnimation(this.animations.walk);

        }

        if(this.turnDirection) {
            this.smoothTurn(deltaSec);
            this.setAnimation(this.animations.walk);
        }

        if(!this.movingForward && !this.movingBackward) {
            this.stopMovement();
        }
    },

    startSprinting() {
        if (this.movingForward) {
            this.speed = this.data.sprintSpeed;
            this.setAnimation(this.animations.sprint);
        }
    },

    stopSprinting() {
        this.speed = this.data.speed;
        if (this.movingForward || this.movingBackward || this.turnDirection) {
            this.setAnimation(this.animations.walk);
        } else {
            this.setAnimation(this.animations.idle);
        }
    },

    smoothTurn(deltaSec) {
        const dir = this.turnDirection === 'right' ? -1 : 1;
        this.currentRotation = (this.currentRotation + dir * this.rotationSpeed * deltaSec + 360) % 360;

        const angleRad = THREE.MathUtils.degToRad(this.currentRotation);

        const quaternion = new Ammo.btQuaternion();
        quaternion.setRotation(new Ammo.btVector3(0, 1, 0), angleRad);

        const transform = this.el.body.getWorldTransform();
        const origin = transform.getOrigin();

        const newTransform = new Ammo.btTransform();
        newTransform.setIdentity();
        newTransform.setOrigin(origin);
        newTransform.setRotation(quaternion);

        this.el.body.setWorldTransform(newTransform);
        this.el.body.activate();
    },

    move(forward = true) {
        const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
        const factor = forward ? 1 : -1;
        const x = Math.sin(angleRad) * this.speed * factor;
        const z = Math.cos(angleRad) * this.speed * factor;
        const velocity = new Ammo.btVector3(x, 0, z);
        this.el.body.setLinearVelocity(velocity);
    },

    stopMovement() {
        const currentVelocity = this.el.body.getLinearVelocity();
        const zeroVelocity = new Ammo.btVector3(0, currentVelocity.y(), 0);
        this.el.body.setLinearVelocity(zeroVelocity);
        this.setAnimation(this.animations.idle);
    }

})