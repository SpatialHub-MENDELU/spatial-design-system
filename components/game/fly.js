AFRAME.registerComponent("fly", {
    schema: {
        idleClipName: { type: "string", default: "*Dragon_Flying*" },
        walkClipName: { type: "string", default: "*Dragon_Flying*" },
        sprintClipName: { type: "string", default: "*Dragon_Flying*" },

        keyUp: {type: "string", default: "w"},
        keyDown: {type: "string", default: "s"},
        keyLeft: {type: "string", default: "a"},
        keyRight: {type: "string", default: "d"},
        keyAscend: {type: "string", default: " "},
        keyDescend: {type: "string", default: "c"},

        allowGravity: {type: "boolean", default: false},

        speed: {type: "number", default: 4},
        rotationSpeed: {type: "number", default: 90},

        sprint: {type: "boolean", default: false},
        keySprint: {type: "string", default: "shift"},
        sprintSpeed: {type: "number", default: 10},

        type: {type: "string", default: "freeDirectionalFlight"}, // freeDirectionalFlight, AutoForwardSteer, AutoForwardFixedDirection, MouseDirectedFlight

    },

    init() {
        // GENERAL
        this.characterModel = this.el.children[0]
        this.animations = {
            walk: this.data.walkClipName,
            idle: this.data.idleClipName,
            sprint: this.data.sprintClipName
        }

        this.keys = {
            up: this.data.keyUp.toLowerCase(),
            down: this.data.keyDown.toLowerCase(),
            left: this.data.keyLeft.toLowerCase(),
            right: this.data.keyRight.toLowerCase(),
            ascend: this.data.keyAscend.toLowerCase(),
            descend: this.data.keyDescend.toLowerCase(),
            sprint: this.data.keySprint.toLowerCase(),
        }

        this.allowGravity = this.data.allowGravity

        this.speed = this.data.speed
        this.sprintEnabled = this.data.sprint
        this.sprintSpeed = this.data.sprintSpeed
        this.rotationSpeed = this.data.rotationSpeed

        // types of flight
        this.freeDirectionalFlight = null

        // MOVEMENT
        this.movingForward = false
        this.movingBackward = false
        this.movingLeft = false
        this.movingRight = false
        this.ascending = false
        this.descending = false
        this.isSprinting = false
        this.velocity = null

        this.currentRotation = 180

        // check inputs
        this.wrongInput = false

        if (this.wrongInput) return;

        this.setType()
        this.setAnimation(this.animations.idle)
        this.bindEvents()
    },

    setAnimation(name) {
        if (!this.characterModel) return;
        this.characterModel.setAttribute('animation-mixer', {
            clip: name,
            crossFadeDuration: this.crossFadeDuration,
        });
    },

    bindEvents() {
        document.addEventListener("keydown", this.onKeyDown.bind(this));
        document.addEventListener("keyup", this.onKeyUp.bind(this));
    },

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === this.keys.up) this.movingForward = true
        if (key === this.keys.down) this.movingBackward = true
        if (key === this.keys.left) this.movingLeft = true
        if (key === this.keys.right) this.movingRight = true
        if (key === this.keys.ascend) this.ascending = true
        if (key === this.keys.descend) this.descending = true
        if (this.sprintEnabled && key === this.keys.sprint) {
            // todo: change according to the fly type
            if (this.movingForward) this.isSprinting = true
        }
    },

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === this.keys.up) this.movingForward = false
        if (key === this.keys.down) this.movingBackward = false
        if (key === this.keys.left) this.movingLeft = false
        if (key === this.keys.right) this.movingRight = false
        if (key === this.keys.ascend) this.ascending = false
        if (key === this.keys.descend) this.descending = false
        if (this.sprintEnabled && key === this.keys.sprint) {
            // todo: change according to the fly type
            if (this.movingForward) this.isSprinting = false
        }
    },

    setType() {
        this.freeDirectionalFlight = false

        switch(this.data.type) {
            case 'freeDirectionalFlight':
                this.freeDirectionalFlight = true
                break;
            default:
                this.freeDirectionalFlight = true
                break
        }
    },

    tick(time, deltaTime) {
        const deltaSec = deltaTime / 1000;
        if (this.el.body) {
            if (!this.allowGravity) this.el.body.setGravity(new Ammo.btVector3(0, 0, 0));
            if (this.freeDirectionalFlight) this.freeDirectionalFlightMove(deltaSec)

            this.el.body.setLinearVelocity(this.velocity);
        }
    },

    stopMovement() {
        const currentVelocity = this.el.body.getLinearVelocity();
        const zeroVelocity = new Ammo.btVector3(0 , currentVelocity.y(), 0);
        this.el.body.setLinearVelocity(zeroVelocity);
        this.setAnimation(this.animations.idle);
    },

    move() {
        const currentVelocity = this.el.body.getLinearVelocity();
        let speed = this.speed

        if (this.freeDirectionalFlightMove) {
            const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
            const factor = this.movingForward ? 1 : this.movingBackward ? -1 : 0;
            const x = Math.sin(angleRad) * speed * factor;
            const z = Math.cos(angleRad) * speed * factor;
            this.velocity = new Ammo.btVector3(x, currentVelocity.y(), z);

            this.ascendDescendMovement(false, x, z)
        }
    },

    turnSmoothly(deltaSec) {
        const dir = this.movingRight ? -1 : this.movingLeft ? 1 : 0;
        this.currentRotation = (this.currentRotation + dir * this.rotationSpeed * deltaSec + 360) % 360;

        const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
        this.rotateCharacterSmoothly(angleRad);
    },

    // FREE DIRECTIONAL FLIGHT
    freeDirectionalFlightMove(deltaSec) {
        this.setAnimation(this.animations.walk);

        const currentVelocity = this.el.body.getLinearVelocity();
        this.velocity = new Ammo.btVector3(0, currentVelocity.y(), 0);

        if (this.movingForward || this.movingBackward) {
            this.move()
        }

        this.ascendDescendMovement(true)

        if (this.movingRight || this.movingLeft) {
            this.turnSmoothly(deltaSec)
        }

        if (!this.movingForward && !this.movingBackward) this.stopMovement()
    },

    ascendDescendMovement(moving = false, x, z) {
        let speed = 0
        if (this.ascending) speed = this.speed
        else if (this.descending) speed = -this.speed;

        let velX = x
        let velZ = z
        const currentVelocity = this.el.body.getLinearVelocity();
        if (moving) {
            if (this.allowGravity) {
                velX = currentVelocity.x()
                velZ = currentVelocity.z()
            } else {
                const vel = this.velocity
                velX = vel.x()
                velZ = vel.z()
            }
        }

        if (moving) {
            if (this.allowGravity) { // todo remove descending when gravity
                if (this.ascending || this.descending) {
                    this.velocity = new Ammo.btVector3(velX, speed, velZ);
                }
            } else {
                this.velocity = new Ammo.btVector3(velX, speed, velZ);
            }
        }
    },

    rotateCharacterSmoothly(angleRad) {
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
})