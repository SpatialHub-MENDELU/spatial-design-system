AFRAME.registerComponent("fly", {
    schema: {
        idleClipName: {type: "string", default: "*Yes*"},
        walkClipName: {type: "string", default: "*Flying_Idle*"},
        sprintClipName: {type: "string", default: "*Fast_Flying*"},

        keyUp: {type: "string", default: "w"},
        keyDown: {type: "string", default: "s"},
        keyLeft: {type: "string", default: "a"},
        keyRight: {type: "string", default: "d"},
        keyAscend: {type: "string", default: " "},
        keyDescend: {type: "string", default: "c"},

        allowGravity: {type: "boolean", default: false},

        speed: {type: "number", default: 4},
        rotationSpeed: {type: "number", default: 90},

        sprint: {type: "boolean", default: true},
        keySprint: {type: "string", default: "shift"},
        sprintSpeed: {type: "number", default: 10},

        type: {type: "string", default: "autoForward"}, // freeDirectionalFlight, autoForward, AutoForwardFixedDirection, MouseDirectedFlight

        maxPitchDeg: {type: "number", default: 30},
        pitchSpeed: {type: "number", default: 90},
        maxRollDeg: {type: "number", default: 30},
        rollSpeed: {type: "number", default: 90},
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
        this.gravityY = -9.800000190734863

        this.speed = this.data.speed
        this.sprintEnabled = this.data.sprint
        this.sprintSpeed = this.data.sprintSpeed
        this.rotationSpeed = this.data.rotationSpeed

        this.animation = null

        // types of flight
        this.freeDirectionalFlight = null
        this.autoForward = null

        // MOVEMENT
        this.movingForward = false
        this.movingBackward = false
        this.movingLeft = false
        this.movingRight = false
        this.ascending = false
        this.descending = false
        this.isSprinting = false
        this.velocity = null

        this.currentRotation = 0

        // autoForward
        this.maxPitchDeg = this.data.maxPitchDeg
        this.maxRollDeg = this.data.maxRollDeg
        this.pitchSpeed = this.data.pitchSpeed
        this.rollSpeed = this.data.rollSpeed
        this.currentRollDeg = 0;
        this.currentPitchDeg = 0;
        this.currentYawDeg = 0;
        this.finalQuat = null

        // CHECK INPUTS
        this.wrongInput = false

        if (this.wrongInput) return;

        this.setType()
        this.setAnimation(this.animations.idle)
        this.bindEvents()
    },

    setAnimation(name) {
        if (!this.characterModel) return;
        if (this.animation === name) return;
        this.animation = name;

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

        switch (this.data.type) {
            case 'freeDirectionalFlight':
                this.freeDirectionalFlight = true
                break;
            case 'autoForward':
                this.autoForward = true
                break;
            default:
                this.freeDirectionalFlight = true
                break
        }
    },

    tick(time, deltaTime) {
        const deltaSec = deltaTime / 1000;
        if (this.el.body) {
            this.setGravity()

            if (this.freeDirectionalFlight) this.freeDirectionalFlightMove(deltaSec)
            if (this.autoForward) this.autoForwardMove(deltaSec)

            this.el.body.setLinearVelocity(this.velocity);
        }
    },

    stopMovement() {
        const currentVelocity = this.el.body.getLinearVelocity();
        const zeroVelocity = new Ammo.btVector3(0, currentVelocity.y(), 0);
        this.el.body.setLinearVelocity(zeroVelocity);
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

            this.ascendDescendMovement()
        }
    },

    startSprinting() {
        let sprint = false
        if (this.freeDirectionalFlightMove) {
            if (this.movingForward) sprint = true
            else this.stopSprinting()
        }

        if (sprint) {
            this.speed = this.sprintSpeed
        }
    },

    stopSprinting() {
        this.isSprinting = false
        this.speed = this.data.speed
    },

    setGravity() {
        let allowGravity = this.allowGravity

        if (this.autoForward) {
            allowGravity = false
        }
        if (this.freeDirectionalFlight) {
            allowGravity = !!this.allowGravity;
        }

        if (allowGravity) this.el.body.setGravity(new Ammo.btVector3(0, this.gravityY, 0));
        else this.el.body.setGravity(new Ammo.btVector3(0, 0, 0));
    },

    turnSmoothly(deltaSec) {
        const dir = this.movingRight ? -1 : this.movingLeft ? 1 : 0;
        this.currentRotation = (this.currentRotation + dir * this.rotationSpeed * deltaSec + 360) % 360;

        const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
        this.rotateCharacterSmoothly(angleRad);
    },
    ascendDescendMovement() {
        let speed = 0
        if (this.ascending) speed = this.speed
        else if (this.descending) speed = -this.speed;

        const vel = this.velocity
        let velX = vel.x()
        let velZ = vel.z()
        const currentVelocity = this.el.body.getLinearVelocity();

        if (this.allowGravity) {
            velX = currentVelocity.x()
            velZ = currentVelocity.z()
        }

        if (this.allowGravity) { // todo remove descending when gravity
            if (this.ascending || this.descending) {
                this.velocity = new Ammo.btVector3(velX, speed, velZ);
            }
        } else {
            this.velocity = new Ammo.btVector3(velX, speed, velZ);
        }
    },

    rotateCharacterSmoothly(angleRad) {
        const quaternion = new Ammo.btQuaternion();
        quaternion.setRotation(new Ammo.btVector3(0, 1, 0), angleRad);

        this.setTransform(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());
    },

    setTransform(quatX, quatY, quatZ, quatW) {
        const transform = this.el.body.getWorldTransform();
        const origin = transform.getOrigin();

        const newTransform = new Ammo.btTransform();
        newTransform.setIdentity();
        newTransform.setOrigin(origin);
        newTransform.setRotation(new Ammo.btQuaternion(quatX, quatY, quatZ, quatW));
        this.el.body.setWorldTransform(newTransform);
        this.el.body.activate()
    },


    // FREE DIRECTIONAL FLIGHT
    freeDirectionalFlightMove(deltaSec) {
        this.handleFreeDirectionalFlightAnimations()

        const currentVelocity = this.el.body.getLinearVelocity();
        this.velocity = new Ammo.btVector3(0, currentVelocity.y(), 0);

        if (this.sprintEnabled) {
            this.isSprinting ? this.startSprinting() : this.stopSprinting()
        }

        if (this.movingForward || this.movingBackward) {
            this.move()
        }

        this.ascendDescendMovement()

        if (this.movingRight || this.movingLeft) {
            this.turnSmoothly(deltaSec)
        }

        if (!this.movingForward && !this.movingBackward) this.stopMovement()
    },

    handleFreeDirectionalFlightAnimations() {
        const isMoving =
            this.movingForward ||
            this.movingBackward ||
            this.movingRight ||
            this.movingLeft ||
            this.ascending ||
            this.descending;

        if (this.sprintEnabled) {
            if (this.isSprinting) this.setAnimation(this.animations.sprint)
            else if (isMoving) this.setAnimation(this.animations.walk)
            else this.setAnimation(this.animations.idle)
        } else {
            if (isMoving) this.setAnimation(this.animations.walk)
            else this.setAnimation(this.animations.idle)
        }
    },

    // AUTO FORWARD

    autoForwardMove(deltaSec) {
        this.setPitchYawRollDeg(deltaSec)
        this.calculateFinalQuat()

        const speed = this.speed;
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.finalQuat).normalize();
        const vx = forward.x * speed;
        const vy = forward.y * speed;
        const vz = forward.z * speed;

        this.velocity = new Ammo.btVector3(vx, vy, vz);
        this.setTransform(this.finalQuat.x, this.finalQuat.y, this.finalQuat.z, this.finalQuat.w);
    },

    calculateFinalQuat() {
        const roll = THREE.MathUtils.degToRad(this.currentRollDeg);
        const pitch = THREE.MathUtils.degToRad(this.currentPitchDeg);
        const yaw = THREE.MathUtils.degToRad(this.currentYawDeg);

        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll);

        this.finalQuat = new THREE.Quaternion();
        this.finalQuat.multiply(yawQuat).multiply(pitchQuat).multiply(rollQuat);
        this.finalQuat.normalize();
    },

    setPitchYawRollDeg(deltaSec) {
        const maxPitchDeg = this.maxPitchDeg;
        const maxRollDeg = this.maxRollDeg;
        const pitchSpeedDeg = this.pitchSpeed * deltaSec * 0.8;
        const rollSpeedDeg = this.rollSpeed * deltaSec;

        // pitch - nose up/down
        if (this.movingForward) {
            this.currentPitchDeg = Math.max(-maxPitchDeg, this.currentPitchDeg - pitchSpeedDeg);
        } else if (this.movingBackward) {
            this.currentPitchDeg = Math.min(maxPitchDeg, this.currentPitchDeg + pitchSpeedDeg);
        } else {
            this.currentPitchDeg += (0 - this.currentPitchDeg) * 0.05;
        }

        // roll - tilt left/right
        if (this.movingRight) {
            this.currentRollDeg = Math.min(maxRollDeg, this.currentRollDeg + rollSpeedDeg);
        } else if (this.movingLeft) {
            this.currentRollDeg = Math.max(-maxRollDeg, this.currentRollDeg - rollSpeedDeg);
        } else {
            this.currentRollDeg += (0 - this.currentRollDeg) * 0.05;
        }

        // yaw - turn left/right
        const yawTurnSpeed = -THREE.MathUtils.degToRad(this.currentRollDeg) * 0.8;
        this.currentYawDeg += THREE.MathUtils.radToDeg(yawTurnSpeed) * deltaSec;
    },


})