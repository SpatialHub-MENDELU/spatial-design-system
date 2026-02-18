import {doesGLTFAnimationExist, hasGLTFAnimations, isPositiveNumber, isValidGameKey, isValidValue} from "../../utils/gameUtils";


AFRAME.registerComponent("fly", {
    schema: {
        idleClipName: {type: "string", default: "*Yes*"}, // Name of the animation clip used when the character is idle.
        flyClipName: {type: "string", default: "*Flying_Idle*"}, // Name of the animation clip used when the character is flying.
        sprintClipName: {type: "string", default: "*Fast_Flying*"}, // Name of the animation clip used when the character is sprinting.

        keyUp: {type: "string", default: "w"}, // Key used to move the character forward/up.
        keyDown: {type: "string", default: "s"}, // Key used to move the character backward/down.
        keyLeft: {type: "string", default: "a"}, // Key used to move the character left.
        keyRight: {type: "string", default: "d"}, // Key used to move the character right.
        keyAscend: {type: "string", default: " "}, // Key used to move the character upward while flying.
        keyDescend: {type: "string", default: "c"}, // Key used to move the character downward while flying.

        allowGravity: {type: "boolean", default: false}, // If true, gravity affects the character when not flying.

        speed: {type: "number", default: 4}, // Defines the player's base flying speed.
        rotationSpeed: {type: "number", default: 40}, // Defines the turning speed. It is used only when allowRoll is false.

        sprint: {type: "boolean", default: false}, // If true, the player can sprint when holding the sprintKey, increasing their speed to sprintSpeed.
        keySprint: {type: "string", default: "shift"}, // Key used to sprint with the character.
        sprintSpeed: {type: "number", default: 10}, // Defines the sprinting speed when the sprint mode is active.

        type: {type: "string", default: "freeDirectionalFlight"}, // freeDirectionalFlight, autoForward, autoForwardFixedDirection. Defines the flying mode and how the player turns the character.

        allowPitch: {type: "boolean", default: true}, // If true, the player can tilt the model up and down (change pitch).
        autoLevelPitch: {type: "boolean", default: true}, // Determines whether the model automatically returns its pitch to a neutral (level) position after being tilted up or down. Only autoForward type can have false value.
        maxPitchDeg: {type: "number", default: 20}, // Maximum pitch angle in degrees the character can tilt up or down.
        pitchSpeed: {type: "number", default: 60}, //How fast the pitch angle changes when the player tilts up or down.

        allowRoll: {type: "boolean", default: true}, // If true, the player can roll the model left or right (bank sideways).
        autoLevelRoll: {type: "boolean", default: true}, // Determines whether the model automatically returns its roll (bank angle) to a neutral, level position after being tilted left or right. Only autoForward flight type can have the false value.
        maxRollDeg: {type: "number", default: 20}, // Maximum roll angle in degrees the character can tilt left or right.
        rollSpeed: {type: "number", default: 60}, // How fast the roll angle changes when the player banks left or right.

        forwardOffsetAngle: {type: "number", default: 0}, // The angular offset (in degrees) that defines how much the model’s logical forward direction differs from its visual or model-space forward axis.

        // only auto forward fixed direction properties
        canMoveVertically: {type: "boolean", default: true}, // When using AutoForwardFixedDirection movement, this property allows the character to move up and down.
        canMoveHorizontally: {type: "boolean", default: true}, // When using AutoForwardFixedDirection movement, this property allows the character to move left and right.
    },


    init() {
        // GENERAL
        this.characterModel = this.el.children[0]
        this.animations = {
            walk: this.data.flyClipName,
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
        this.autoForwardFixedDirection = null

        // MOVEMENT
        this.movingForward = false
        this.movingBackward = false
        this.movingLeft = false
        this.movingRight = false
        this.ascending = false
        this.descending = false
        this.isSprinting = false
        this.velocity = null

        // transformation
        this.displayQuat = null

        // rotation
        this.forwardOffsetAngle = this.data.forwardOffsetAngle
        this.elementRotationY = this.el.getAttribute('rotation').y
        this.currentRotation = this.elementRotationY;

        // pitch
        this.allowPitch = this.data.allowPitch
        this.autoLevelPitch = this.data.autoLevelPitch
        this.maxPitchDeg = this.data.maxPitchDeg
        this.pitchSpeed = this.data.pitchSpeed
        this.currentPitchDeg = 0;
        this.pitchRad = THREE.MathUtils.degToRad(this.currentPitchDeg);
        this.pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitchRad);

        //roll
        this.allowRoll = this.data.allowRoll
        this.autoLevelRoll = this.data.autoLevelRoll
        this.maxRollDeg = this.data.maxRollDeg
        this.rollSpeed = this.data.rollSpeed
        this.currentRollDeg = 0;
        this.rollRad = THREE.MathUtils.degToRad(this.currentRollDeg);
        this.rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.rollRad);

        // yaw
        this.currentYawDeg = 0;
        this.yawRad = THREE.MathUtils.degToRad(this.currentYawDeg);
        this.yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yawRad);

        // autoForward

        this.finalQuat = null
        this.verticalVelocity = null

        this.elementRotationYToDeg = THREE.MathUtils.degToRad(this.elementRotationY);
        this.baseQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.elementRotationYToDeg);

        // autoForwardFixedDirection
        this.canMoveVertically = this.data.canMoveVertically
        if (this.canMoveVertically === false) this.allowPitch = false

        this.canMoveHorizontally = this.data.canMoveHorizontally
        if (this.canMoveHorizontally === false) this.allowRoll = false

        // CHECK INPUTS
        this.wrongInput = false
        this.hasModelAnimations = false
        this.checkInputs()

        if (this.wrongInput) return;

        this.setType()
        this.setInitialAnimation()
        this.bindEvents()
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // GENERAL METHODS

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
        if (this.sprintEnabled && key === this.keys.sprint) this.setIsSprinting(true)
    },

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === this.keys.up) this.movingForward = false
        if (key === this.keys.down) this.movingBackward = false
        if (key === this.keys.left) this.movingLeft = false
        if (key === this.keys.right) this.movingRight = false
        if (key === this.keys.ascend) this.ascending = false
        if (key === this.keys.descend) this.descending = false
        if (this.sprintEnabled && key === this.keys.sprint) this.setIsSprinting(false)
    },

    tick(time, deltaTime) {
        const deltaSec = deltaTime / 1000;
        if (this.el.body) {
            this.setGravity()

            if (this.freeDirectionalFlight) this.freeDirectionalFlightMove(deltaSec)
            if (this.autoForward) this.autoForwardMove(deltaSec)
            if (this.autoForwardFixedDirection) this.autoForwardFixedDirectionMove(deltaSec)

            this.el.body.setLinearVelocity(this.velocity);
            this.el.body.activate()
        }
    },


    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CHECK INPUTS & UPDATE

    checkInputs() {
        // animations check
        this.el.addEventListener('model-loaded', (e) => {
            const model = e.detail.model;
            const hasModelAnimations = hasGLTFAnimations(model)
            this.hasModelAnimations = hasModelAnimations
            if (hasModelAnimations === true) {
                if (!doesGLTFAnimationExist(model, this.data.flyClipName)) this.wrongInput = true
                if (!doesGLTFAnimationExist(model, this.data.idleClipName)) this.wrongInput = true
                if (this.sprintEnabled && !doesGLTFAnimationExist(model, this.data.sprintClipName)) this.wrongInput = true
            }
        })

        // flight type
        if (!isValidValue(this.data.type, "type", ['freeDirectionalFlight', 'autoForward', 'autoForwardFixedDirection'])) this.wrongInput = true

        // speeds
        if (!isPositiveNumber(this.data.speed, "speed")) this.wrongInput = true
        if (!isPositiveNumber(this.data.rotationSpeed, "rotationSpeed")) this.wrongInput = true
        if (this.sprintEnabled && !isPositiveNumber(this.data.sprintSpeed, "sprintSpeed")) this.wrongInput = true
        if (!isPositiveNumber(this.data.pitchSpeed, "pitchSpeed")) this.wrongInput = true
        if (!isPositiveNumber(this.data.rollSpeed, "rollSpeed")) this.wrongInput = true
        if (!isPositiveNumber(this.data.maxPitchDeg, "maxPitchDeg")) this.wrongInput = true
        if (!isPositiveNumber(this.data.maxRollDeg, "maxRollDeg")) this.wrongInput = true

        // keys
        if (!isValidGameKey(this.data.keyUp)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyDown)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyLeft)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyRight)) this.wrongInput = true
        if (this.sprintEnabled && !isValidGameKey(this.data.keySprint)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyAscend)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyDescend)) this.wrongInput = true
    },

    update(oldData) {
        this.wrongInput = false
        this.checkInputs()
        if (this.wrongInput) return

        // animations
        if (oldData.flyClipName !== this.data.flyClipName) this.animations.walk = this.data.flyClipName
        if (oldData.idleClipName !== this.data.idleClipName) this.animations.idle = this.data.idleClipName
        if (oldData.sprintClipName !== this.data.sprintClipName) this.animations.sprint = this.data.sprintClipName

        // keys
        if (oldData.keyUp !== this.data.keyUp.toLowerCase()) this.keys.up = this.data.keyUp.toLowerCase()
        if (oldData.keyDown !== this.data.keyDown.toLowerCase()) this.keys.down = this.data.keyDown.toLowerCase()
        if (oldData.keyLeft !== this.data.keyLeft.toLowerCase()) this.keys.left = this.data.keyLeft.toLowerCase()
        if (oldData.keyRight !== this.data.keyRight.toLowerCase()) this.keys.right = this.data.keyRight.toLowerCase()
        if (oldData.keySprint !== this.data.keySprint.toLowerCase()) this.keys.sprint = this.data.keySprint.toLowerCase()
        if (oldData.keyAscend !== this.data.keyAscend.toLowerCase()) this.keys.ascend = this.data.keyAscend.toLowerCase()
        if (oldData.keyDescend !== this.data.keyDescend.toLowerCase()) this.keys.descend = this.data.keyDescend.toLowerCase()

        // movement
        if (oldData.allowGravity !== this.data.allowGravity) this.allowGravity = this.data.allowGravity

        if (oldData.speed !== this.data.speed) this.speed = this.data.speed
        if (oldData.rotationSpeed !== this.data.rotationSpeed) this.rotationSpeed = this.data.rotationSpeed
        if (oldData.sprint !== this.data.sprint) this.sprintEnabled = this.data.sprint
        if (oldData.sprintSpeed !== this.data.sprintSpeed) this.sprintSpeed = this.data.sprintSpeed

        if (oldData.type !== this.data.type) this.setType()

        if (oldData.allowPitch !== this.data.allowPitch) this.allowPitch = this.data.allowPitch
        if (oldData.autoLevelPitch !== this.data.autoLevelPitch) this.autoLevelPitch = this.data.autoLevelPitch
        if (oldData.maxPitchDeg !== this.data.maxPitchDeg) this.maxPitchDeg = this.data.maxPitchDeg
        if (oldData.pitchSpeed !== this.data.pitchSpeed) this.pitchSpeed = this.data.pitchSpeed

        if (oldData.allowRoll !== this.data.allowRoll) this.allowRoll = this.data.allowRoll
        if (oldData.autoLevelRoll !== this.data.autoLevelRoll) this.autoLevelRoll = this.data.autoLevelRoll
        if (oldData.maxRollDeg !== this.data.maxRollDeg) this.maxRollDeg = this.data.maxRollDeg
        if (oldData.rollSpeed !== this.data.rollSpeed) this.rollSpeed = this.data.rollSpeed

        if (oldData.forwardOffsetAngle !== this.data.forwardOffsetAngle) this.forwardOffsetAngle = this.data.forwardOffsetAngle

        if (oldData.canMoveVertically !== this.data.canMoveVertically) this.canMoveVertically = this.data.canMoveVertically
        if (this.canMoveVertically === false) this.allowPitch = false

        if (oldData.canMoveHorizontally !== this.data.canMoveHorizontally) this.canMoveHorizontally = this.data.canMoveHorizontally
        if (this.canMoveHorizontally === false) this.allowRoll = false
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // SET METHODS

    setAnimation(name) {
        if (!this.characterModel) return;
        if (this.animation === name) return;
        if (!this.hasModelAnimations) return;
        this.animation = name;

        this.characterModel.setAttribute('animation-mixer', {
            clip: name,
            crossFadeDuration: this.crossFadeDuration,
        });
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
            case 'autoForwardFixedDirection':
                this.autoForwardFixedDirection = true
                break;
            default:
                this.freeDirectionalFlight = true
                break
        }
    },

    setInitialAnimation() {
        if (this.freeDirectionalFlight) this.setAnimation(this.animations.idle)
        if (this.autoForward || this.autoForwardFixedDirection) this.setAnimation(this.animations.walk)
    },

    setIsSprinting(value) {
        if (value === true) {
            if (this.freeDirectionalFlightMove) if (this.movingForward) this.isSprinting = true
            if (this.autoForward || this.autoForwardFixedDirection) this.isSprinting = true
        } else {
            if (this.freeDirectionalFlightMove) if (this.movingForward) this.isSprinting = false
            if (this.autoForward || this.autoForwardFixedDirection) this.isSprinting = false
        }
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

    setTransform(quatX, quatY, quatZ, quatW) {
        const transform = this.el.body.getWorldTransform();
        const origin = transform.getOrigin();

        const newTransform = new Ammo.btTransform();
        newTransform.setIdentity();
        newTransform.setOrigin(origin);
        newTransform.setRotation(new Ammo.btQuaternion(quatX, quatY, quatZ, quatW));
        this.el.body.setWorldTransform(newTransform);
        // this.el.body.activate()
    },

    setDisplayQuat() {
        if (this.forwardOffsetAngle) {
            const offsetRad = THREE.MathUtils.degToRad(this.forwardOffsetAngle);
            const offsetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), offsetRad);
            this.displayQuat.multiply(offsetQuat);
        }
    },

    setPitchRollYatQuat() {
        this.rollRad = THREE.MathUtils.degToRad(this.currentRollDeg);
        this.rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.rollRad);

        this.pitchRad = THREE.MathUtils.degToRad(this.currentPitchDeg);
        this.pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitchRad);

        this.yawRad = THREE.MathUtils.degToRad(this.currentRotation)
        this.yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yawRad);

    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // MOVEMENT METHODS

    stopMovement() {
        const currentVelocity = this.el.body.getLinearVelocity();
        const zeroVelocity = new Ammo.btVector3(0, currentVelocity.y(), 0);
        this.el.body.setLinearVelocity(zeroVelocity);
    },

    move() {
        const currentVelocity = this.el.body.getLinearVelocity();
        let speed = this.speed

        if (this.freeDirectionalFlight) {
            const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
            const factor = this.movingForward ? 1 : this.movingBackward ? -1 : 0;
            const x = Math.sin(angleRad) * speed * factor;
            const z = Math.cos(angleRad) * speed * factor;
            this.velocity = new Ammo.btVector3(x, currentVelocity.y(), z);

            this.ascendDescendMovement()
        }
    },

    startSprinting() {
        this.speed = this.sprintSpeed
    },

    stopSprinting() {
        this.isSprinting = false
        this.speed = this.data.speed
    },

    turnSmoothly(deltaSec) {
        const dir = this.movingRight ? -1 : this.movingLeft ? 1 : 0;
        this.currentRotation = (this.currentRotation + dir * this.rotationSpeed * deltaSec + 360) % 360;
    },

    ascendDescendMovement() {
        let speed = 0
        if (this.ascending) speed = this.speed
        else if (this.descending) speed = -this.speed;

        const vel = this.velocity
        let velX = vel.x()
        let velZ = vel.z()

        if (this.allowGravity) {
            if (this.ascending) {
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

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // FLYING TYPES

    // FREE DIRECTIONAL FLIGHT

    freeDirectionalFlightMove(deltaSec) {
        this.handleFreeDirectionalFlightAnimations();

        const currentVelocity = this.el.body.getLinearVelocity();
        this.velocity = new Ammo.btVector3(0, currentVelocity.y(), 0);

        if (this.sprintEnabled) {
            this.isSprinting ? this.startSprinting() : this.stopSprinting();
        }

        if (this.movingForward || this.movingBackward) {
            this.move();
        }

        this.ascendDescendMovement();

        if (this.movingRight || this.movingLeft) {
            this.turnSmoothly(deltaSec);
        }

        if (!this.movingForward && !this.movingBackward) {
            this.stopMovement();
        }

        this.updatePitchRollVisuals(deltaSec);

    },

    updatePitchRollVisuals(deltaSec) {
        if (this.allowPitch) {
            this.setPitchDeg(deltaSec);
        } else {
            this.currentPitchDeg = 0;
        }

        if (this.allowRoll) {
            this.setRollDeg(deltaSec);
        } else {
            this.currentRollDeg = 0;
        }

        this.setPitchRollYatQuat();

        this.displayQuat = new THREE.Quaternion();
        this.displayQuat.multiply(this.yawQuat).multiply(this.pitchQuat).multiply(this.rollQuat);
        this.displayQuat.normalize();

        this.setDisplayQuat()

        this.setTransform(this.displayQuat.x, this.displayQuat.y, this.displayQuat.z, this.displayQuat.w);
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

    handleAutoForwardAnimations() {
        const animation = this.sprintEnabled && this.isSprinting ? this.animations.sprint : this.animations.walk;
        this.setAnimation(animation);
    },

    autoForwardMove(deltaSec) {
        this.handleAutoForwardAnimations()

        // yaw - turn left/right
        if (this.allowRoll) this.setYawDeg(deltaSec);
        else {
            const dir = this.movingRight ? -1 : this.movingLeft ? 1 : 0;
            this.currentYawDeg = (this.currentYawDeg + dir * this.rotationSpeed * deltaSec) % 360;
        }

        // pitch - nose up/down
        if (this.allowPitch) this.setPitchDeg(deltaSec);
        else {
            const moveUp = this.movingForward ? 1 : this.movingBackward ? -1 : 0;
            this.verticalVelocity = moveUp * this.speed;
        }

        // roll - tilt left/right
        this.setRollDeg(deltaSec);

        this.calculateFinalQuat();

        if (this.sprintEnabled) {
            this.isSprinting ? this.startSprinting() : this.stopSprinting();
        }

        const speed = this.speed;
        const forward = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(this.finalQuat)
            .normalize();

        const vx = forward.x * speed;
        const vy = forward.y * speed + (this.verticalVelocity || 0);
        const vz = forward.z * speed;

        this.velocity = new Ammo.btVector3(vx, vy, vz);

        this.displayQuat = this.finalQuat.clone();
        this.setDisplayQuat()

        this.setTransform(this.displayQuat.x, this.displayQuat.y, this.displayQuat.z, this.displayQuat.w);
    },

    calculateFinalQuat() {
        const roll = THREE.MathUtils.degToRad(this.currentRollDeg);
        const pitch = THREE.MathUtils.degToRad(this.currentPitchDeg);
        const yaw = THREE.MathUtils.degToRad(this.currentYawDeg);

        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll);

        const movementQuat = new THREE.Quaternion();

        movementQuat.multiply(yawQuat).multiply(pitchQuat).multiply(rollQuat);

        movementQuat.normalize();

        this.finalQuat = this.baseQuat.clone().multiply(movementQuat);
    },

    setPitchDeg(deltaSec) {
        // pitch - nose up/down
        if (this.allowPitch === false) return;

        let allowAutoLevelPitch = this.autoLevelPitch
        if (this.freeDirectionalFlight || this.autoForwardFixedDirection) allowAutoLevelPitch = true

        const maxPitchDeg = this.maxPitchDeg;
        const pitchSpeedDeg = this.pitchSpeed * deltaSec

        const pitchUp = this.freeDirectionalFlight ? this.descending && !this.allowGravity : this.movingBackward;
        const pitchDown = this.freeDirectionalFlight ? this.ascending : this.movingForward;

        if (pitchUp) {
            this.currentPitchDeg = Math.min(maxPitchDeg, this.currentPitchDeg + pitchSpeedDeg);
        } else if (pitchDown) {
            this.currentPitchDeg = Math.max(-maxPitchDeg, this.currentPitchDeg - pitchSpeedDeg);
        } else if (allowAutoLevelPitch) {
            this.currentPitchDeg += (0 - this.currentPitchDeg) * 0.05;
        }
    },

    setRollDeg(deltaSec) {
        if (this.allowRoll === false) return;

        const maxRollDeg = this.maxRollDeg;
        const rollSpeedDeg = this.rollSpeed * deltaSec;

        let allowRoll = true
        if (this.freeDirectionalFlight) {
            allowRoll = !!(this.movingForward || this.movingBackward);
        }

        let allowAutoRoll = this.autoLevelRoll
        if (this.freeDirectionalFlight || this.autoForwardFixedDirection) allowAutoRoll = true

        // roll - tilt left/right
        if (this.movingRight) {
            if (allowRoll) this.currentRollDeg = Math.min(maxRollDeg, this.currentRollDeg + rollSpeedDeg);
        } else if (this.movingLeft) {
            if (allowRoll) this.currentRollDeg = Math.max(-maxRollDeg, this.currentRollDeg - rollSpeedDeg);
        } else {
            if (allowAutoRoll) this.currentRollDeg += (0 - this.currentRollDeg) * 0.05;
        }
    },

    setYawDeg(deltaSec) {
        const keyDir = this.movingRight ? -1 : this.movingLeft ? 1 : 0;
        let finalDir = keyDir;

        if (this.autoLevelRoll === false) {
            const bankingDir = -(this.currentRollDeg / this.maxRollDeg);
            finalDir = Math.max(-1, Math.min(1, keyDir + bankingDir));
        }

        const yawChange = finalDir * this.rotationSpeed * deltaSec;
        this.currentYawDeg = (this.currentYawDeg + yawChange) % 360;
    },

    // AUTO FORWARD FIXED DIRECTION

    autoForwardFixedDirectionMove(deltaSec) {
        if (this.sprintEnabled) {
            this.isSprinting ? this.startSprinting() : this.stopSprinting();
        }

        this.handleAutoForwardAnimations()

        const speed = this.speed;
        const currentVelocity = this.el.body.getLinearVelocity();
        const rotationY = this.elementRotationYToDeg;

        const forward = new THREE.Vector3(0, 0, 1)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY)
            .normalize();
        let offset = new THREE.Vector3(0, 0, 0);

        if (this.canMoveVertically) {
            if (this.movingForward) offset.add(new THREE.Vector3(0, 1, 0).multiplyScalar(speed));
            if (this.movingBackward) offset.add(new THREE.Vector3(0, -1, 0).multiplyScalar(speed));
        }

        if (this.canMoveHorizontally) {
            if (this.movingRight) offset.add(new THREE.Vector3(-1, 0, 0).multiplyScalar(speed));
            if (this.movingLeft) offset.add(new THREE.Vector3(1, 0, 0).multiplyScalar(speed));
        }

        const rotationQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
        offset.applyQuaternion(rotationQuat);

        this.setPitchDeg(deltaSec);
        this.setRollDeg(deltaSec)

        this.setPitchRollYatQuat()

        this.displayQuat = rotationQuat.clone();
        this.displayQuat.multiply(this.pitchQuat).multiply(this.rollQuat);

        this.setDisplayQuat()

        this.setTransform(this.displayQuat.x, this.displayQuat.y, this.displayQuat.z, this.displayQuat.w);

        const finalVelocity = forward.clone().multiplyScalar(speed).add(offset);
        const vy = this.canMoveVertically ? finalVelocity.y : currentVelocity.y();
        this.velocity = new Ammo.btVector3(finalVelocity.x, vy, finalVelocity.z);
    },


})