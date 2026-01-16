import {doesGLTFAnimationExist, isPositiveNumber, isValidGameKey} from "../../utils/gameUtils";

AFRAME.registerComponent("walk", {
    schema: {
        walkClipName: {type: "string", default: "Walk"}, // Name of the animation clip used when the character is walking.
        idleClipName: {type: "string", default: "Idle"}, // Name of the animation clip used when the character is idle.
        sprintClipName: {type: "string", default: "Gallop"}, // Name of the animation clip used when the character is sprinting.

        keyUp: {type: "string", default: "w"}, // Key used to move the character forward.
        keyDown: {type: "string", default: "s"}, // Key used to move the character backward.
        keyLeft: {type: "string", default: "a"}, // Key used to move the character left.
        keyRight: {type: "string", default: "d"}, // Key used to move the character right.

        speed: {type: "number", default: 5}, // Defines the player's base walking speed.
        rotationSpeed: {type: "number", default: 90}, // Defines the turning speed for smoothTurn mode.

        sprint: {type: "boolean", default: false}, // If true, the player can sprint when holding the sprintKey, increasing their speed to sprintSpeed.
        keySprint: {type: "string", default: "shift"}, // Key used to sprint with the character.
        sprintSpeed: {type: "number", default: 8}, // Defines the sprinting speed when the sprint mode is active.

        turnType: {type: "string", default: "smoothTurn"}, // smoothTurn, stepTurnDiagonal, stepTurnCardinal. Defines the walking mode and how the player turns and moves.
        autoWalk: {type: "boolean", default: false}, // If true, the player will automatically start walking forward without input.
        targetWalk: {type: "boolean", default: false}, // If true, enables point-and-click movement: the character walks toward the location where the player clicks.

        startMovingDirection: {type: "string", default: "down"}, // down, up, left, right,
    },

    init() {
        // GENERAL
        this.characterModel = this.el.children[0];
        this.animations = {
            walk: this.data.walkClipName,
            idle: this.data.idleClipName,
            sprint: this.data.sprintClipName
        };

        this.scene = this.el.sceneEl;
        this.camera = this.el.sceneEl.camera

        this.keys = {
            up: this.data.keyUp.toLowerCase(),
            down: this.data.keyDown.toLowerCase(),
            left: this.data.keyLeft.toLowerCase(),
            right: this.data.keyRight.toLowerCase(),
            sprint: this.data.keySprint.toLowerCase(),
        };

        this.speed = this.data.speed;
        this.sprintEnabled = this.data.sprint;
        this.sprintSpeed = this.data.sprintSpeed
        this.isSprinting = false;

        this.crossFadeDuration = 0.2
        this.currentAnimation = null
        this.currentTimeScale = null

        this.autoWalk = this.data.autoWalk;
        this.targetWalk = this.data.targetWalk

        this.smoothTurn = false;
        this.stepTurnDiagonal = false;
        this.stepTurnCardinal = false;

        // SMOOTH WALKING
        this.turnDirection = null;
        this.movingForward = false;
        this.movingBackward = false;
        this.rotationSpeed = this.data.rotationSpeed;
        this.currentRotation = 0;

        // STEP TURN DIAGONAL && STEP TURN HORIZONTAL
        this.rotationY = 0;
        this.movingDirection = this.data.startMovingDirection
        this.newDirection = this.data.startMovingDirection
        this.movingLeft = false;
        this.movingRight = false;
        // this.movingForward
        // this.movingBackward

        // TARGET WALK
        this.reachTarget = true;
        this.targetPosition = this.el.object3D.position
        this.rotationToTarget = null
        if (this.targetWalk) this.rotationSpeed = 450

        // Check inputs
        this.wrongInput = false;
        this.checkInputs()

        if (this.wrongInput) return;

        this.setAnimation(this.animations.idle);
        this.bindEvents();
        this.setTurnType()
    },

    update(oldData) {
        this.wrongInput = false
        this.checkInputs()
        if (this.wrongInput) return

        // animations
        if (oldData.walkClipName !== this.data.walkClipName) this.animations.walk = this.data.walkClipName
        if (oldData.idleClipName !== this.data.idleClipName) this.animations.idle = this.data.idleClipName
        if (oldData.sprintClipName !== this.data.sprintClipName) this.animations.sprint = this.data.sprintClipName

        // keys
        if (oldData.keyUp !== this.data.keyUp.toLowerCase()) this.keys.up = this.data.keyUp.toLowerCase()
        if (oldData.keyDown !== this.data.keyDown.toLowerCase()) this.keys.down = this.data.keyDown.toLowerCase()
        if (oldData.keyLeft !== this.data.keyLeft.toLowerCase()) this.keys.left = this.data.keyLeft.toLowerCase()
        if (oldData.keyRight !== this.data.keyRight.toLowerCase()) this.keys.right = this.data.keyRight.toLowerCase()
        if (oldData.keySprint !== this.data.keySprint.toLowerCase()) this.keys.sprint = this.data.keySprint.toLowerCase()

        // movement
        if (oldData.speed !== this.data.speed) this.speed = this.data.speed
        if (oldData.rotationSpeed !== this.data.rotationSpeed) this.rotationSpeed = this.data.rotationSpeed
        if (oldData.sprint !== this.data.sprint) this.sprintEnabled = this.data.sprint
        if (oldData.sprintSpeed !== this.data.sprintSpeed) this.sprintSpeed = this.data.sprintSpeed
        if (oldData.turnType !== this.data.turnType) {
            this.setTurnType();
        }
        if (oldData.autoWalk !== this.data.autoWalk) this.autoWalk = this.data.autoWalk
        if (oldData.targetWalk !== this.data.targetWalk) {
            this.targetWalk = this.data.targetWalk
            if (this.targetWalk) this.rotationSpeed = 460
        }
    },

    checkInputs() {
        this.el.addEventListener('model-loaded', (e) => {
            const model = e.detail.model;
            if (!doesGLTFAnimationExist(model, this.data.walkClipName)) this.wrongInput = true
            if (!doesGLTFAnimationExist(model, this.data.idleClipName)) this.wrongInput = true
            if (this.sprintEnabled && !doesGLTFAnimationExist(model, this.data.sprintClipName)) this.wrongInput = true
        })

        if (!isPositiveNumber(this.data.speed, "speed")) this.wrongInput = true
        if (!isPositiveNumber(this.data.rotationSpeed, "rotationSpeed")) this.wrongInput = true
        if (this.sprintEnabled && !isPositiveNumber(this.data.sprintSpeed, "sprintSpeed")) this.wrongInput = true

        if (!this.isValidTurnType(this.data.turnType)) this.wrongInput = true

        if (!isValidGameKey(this.data.keyUp)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyDown)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyLeft)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyRight)) this.wrongInput = true
        if (this.sprintEnabled && !isValidGameKey(this.data.keySprint)) this.wrongInput = true
    },

    isValidTurnType(value) {
        const validTypes = ['smoothTurn', 'stepTurnDiagonal', 'stepTurnCardinal'];
        if (!validTypes.includes(value)) {
            console.warn(`Invalid turnType: "${value}". Valid options are: ${validTypes.join(', ')}.`);
            return false
        }
        return true
    },


    setTurnType() {
        if (this.targetWalk) return

        this.smoothTurn = false;
        this.stepTurnDiagonal = false;
        this.stepTurnCardinal = false

        switch (this.data.turnType) {
            case 'smoothTurn':
                this.smoothTurn = true;
                break;
            case "stepTurnDiagonal":
                this.stepTurnDiagonal = true;
                break;
            case "stepTurnCardinal":
                this.stepTurnCardinal = true;
                break;
            default:
                this.smoothTurn = true;
                break;
        }
    },

    bindEvents() {
        document.addEventListener("keydown", this.onKeyDown.bind(this));
        document.addEventListener("keyup", this.onKeyUp.bind(this));
        document.addEventListener("click", this.onClick.bind(this));
    },

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === this.keys.left) {
            this.turnDirection = 'left';
            this.movingLeft = true
        }
        if (key === this.keys.right) {
            this.movingRight = true
            this.turnDirection = 'right';
        }
        if (key === this.keys.up) {
            this.movingForward = true;
        }
        if (key === this.keys.down) this.movingBackward = true;
        if (this.sprintEnabled && key === this.keys.sprint) {
            if (this.smoothTurn) {
                if (this.movingForward) this.isSprinting = true;
            }
            if (this.stepTurnDiagonal || this.stepTurnCardinal) {
                if (this.movingForward || this.movingBackward || this.movingLeft || this.movingRight) this.isSprinting = true;
            }
        }
    },

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === this.keys.left) {
            this.movingLeft = false;
            if (this.turnDirection === 'left') this.turnDirection = null;
        }
        if (key === this.keys.right) {
            this.movingRight = false
            if (this.turnDirection === 'right') this.turnDirection = null;
        }
        if (key === this.keys.up) this.movingForward = false;
        if (key === this.keys.down) this.movingBackward = false;

        if (this.sprintEnabled) {
            if (key === this.keys.sprint) this.isSprinting = false
            if (this.smoothTurn) if (this.isSprinting && !this.movingForward) this.isSprinting = false;
        }

    },

    onClick(e) {
        if (this.targetWalk) {
            this.setTargetPosition(e)
        }
    },

    setAnimation(name, reverse = false) {
        if (!this.characterModel) return;
        if (this.currentAnimation === name && this.currentTimeScale) return;

        this.currentAnimation = name;
        this.currentTimeScale = reverse ? -0.99 : 0.99;

        this.characterModel.setAttribute('animation-mixer', {
            clip: name,
            crossFadeDuration: this.crossFadeDuration,
            timeScale: this.currentTimeScale,
        });
    },

    tick(time, deltaTime) {
        const deltaSec = deltaTime / 1000;

        if (this.el.body) {
            if (this.smoothTurn) this.setSmoothTurnMoving(deltaSec)
            if (this.stepTurnDiagonal || this.stepTurnCardinal) {
                this.updateDirection();
                this.setSmoothStepTurn();
            }
            if (this.autoWalk) {
                this.move()
            }
            if (this.targetWalk) {
                this.checkReachedTarget()
                if (!this.reachTarget) {
                    this.rotateToTarget(deltaSec)
                    this.moveToTarget()
                }
                if (this.reachTarget) this.stopMovement()
            }
        }
    },

    stopMovement() {
        const currentVelocity = this.el.body.getLinearVelocity();
        const zeroVelocity = new Ammo.btVector3(0, currentVelocity.y(), 0);
        this.el.body.setLinearVelocity(zeroVelocity);
        this.setAnimation(this.animations.idle);
    },

    move(forward = true) {
        const currentVelocity = this.el.body.getLinearVelocity();
        let velocity = new Ammo.btVector3(0, currentVelocity.y(), 0);
        const speed = this.speed;

        if (this.smoothTurn) {
            const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
            const factor = forward ? 1 : -1;
            const x = Math.sin(angleRad) * speed * factor;
            const z = Math.cos(angleRad) * speed * factor;
            velocity = new Ammo.btVector3(x, currentVelocity.y(), z);
        }

        if (this.stepTurnDiagonal || this.stepTurnCardinal) {
            switch (this.movingDirection) {
                case 'up':
                    velocity.setValue(0, currentVelocity.y(), -speed);
                    break;
                case 'down':
                    velocity.setValue(0, currentVelocity.y(), speed);
                    break;
                case 'left':
                    velocity.setValue(-speed, currentVelocity.y(), 0);
                    break;
                case 'right':
                    velocity.setValue(speed, currentVelocity.y(), 0);
                    break;
                case 'upLeft':
                    velocity.setValue(-speed, currentVelocity.y(), -speed);
                    break;
                case 'upRight':
                    velocity.setValue(speed, currentVelocity.y(), -speed);
                    break;
                case 'downLeft':
                    velocity.setValue(-speed, currentVelocity.y(), speed);
                    break;
                case 'downRight':
                    velocity.setValue(speed, currentVelocity.y(), speed);
                    break;
            }
        }

        this.el.body.setLinearVelocity(velocity);
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

    // SPRINT
    startSprinting() {
        let sprint = false
        if (this.smoothTurn) if (this.movingForward) sprint = true;
        if (this.stepTurnDiagonal || this.stepTurnCardinal) sprint = true

        if (sprint) {
            this.speed = this.sprintSpeed;
            this.setAnimation(this.animations.sprint);
        }
    },

    stopSprinting() {
        this.speed = this.data.speed;
        if (this.smoothTurn) {
            if (this.movingBackward) this.setAnimation(this.animations.walk, true);
            else if (this.movingForward || this.turnDirection) {
                this.setAnimation(this.animations.walk);
            } else {
                this.setAnimation(this.animations.idle);
            }
        }
        if (this.stepTurnDiagonal || this.stepTurnCardinal) {
            this.setAnimation(
                this.movingLeft || this.movingRight || this.movingForward || this.movingBackward
                    ? this.animations.walk
                    : this.animations.idle
            );
        }
    },

    // STEP TURN DIAGONAL && STEP TURN HORIZONTAL
    setSmoothStepTurn() {
        if (this.autoWalk) this.setAnimation(this.animations.walk);
        if (this.movingLeft || this.movingRight || this.movingBackward || this.movingForward) {
            if (this.sprintEnabled) {
                this.isSprinting ? this.startSprinting() : this.stopSprinting();
            }
            this.move();
            this.setAnimation(this.animations.walk);
        }

        if (!this.movingLeft && !this.movingRight && !this.movingForward && !this.movingBackward) {
            this.stopMovement();
        }
    },

    updateDirection() {
        let newDir = null;
        if (this.stepTurnDiagonal) {
            if (this.movingForward && this.movingRight) newDir = 'upRight';
            else if (this.movingForward && this.movingLeft) newDir = 'upLeft';
            else if (this.movingBackward && this.movingRight) newDir = 'downRight';
            else if (this.movingBackward && this.movingLeft) newDir = 'downLeft';
            else if (this.movingForward) newDir = 'up';
            else if (this.movingBackward) newDir = 'down';
            else if (this.movingRight) newDir = 'right';
            else if (this.movingLeft) newDir = 'left';
        } else {
            if (this.movingForward) newDir = 'up';
            else if (this.movingBackward) newDir = 'down';
            else if (this.movingRight) newDir = 'right';
            else if (this.movingLeft) newDir = 'left';
        }

        if (newDir && newDir !== this.movingDirection) {
            this.newDirection = newDir;
            this.rotateStepTurn();
        }
    },

    rotateStepTurn() {
        if (this.newDirection === this.movingDirection) return;
        const angle = this.stepTurnDiagonal ? 45 : 90;

        const directions = this.stepTurnDiagonal ? ['down', 'downRight', 'right', 'upRight', 'up', 'upLeft', 'left', 'downLeft'] : ['down', 'right', 'up', 'left'];
        let diff = directions.indexOf(this.newDirection) - directions.indexOf(this.movingDirection);
        if (this.stepTurnDiagonal) {
            if (diff > 4) diff -= 8;
            if (diff < -4) diff += 8;
        }
        if (this.stepTurnCardinal) {
            diff = diff >= 3 ? diff - 4 : diff;
            diff = diff <= -3 ? diff + 4 : diff;
        }

        this.rotationY += diff * angle;
        this.movingDirection = this.newDirection;

        if (diff === 0) return;

        this.characterModel.setAttribute('animation', {
            property: 'rotation',
            to: {x: 0, y: this.rotationY, z: 0},
            dur: 200,
            easing: 'easeOutQuad'
        });

        // todo: move also the physics body

        // const angleRad = THREE.MathUtils.degToRad(this.rotationY);
        // const quaternion = new Ammo.btQuaternion();
        // quaternion.setRotation(new Ammo.btVector3(0, 1, 0), angleRad);
        //
        // const transform = this.el.body.getWorldTransform();
        // const origin = transform.getOrigin();
        //
        // const newTransform = new Ammo.btTransform();
        // newTransform.setIdentity();
        // newTransform.setOrigin(new Ammo.btVector3(origin.x(), origin.y(), origin.z()));
        // newTransform.setRotation(quaternion);
        //
        // this.el.body.setWorldTransform(newTransform);
        // this.el.body.activate();

    },

    // SMOOTH TURN
    setSmoothTurnMoving(deltaSec) {
        if (this.autoWalk) this.setAnimation(this.animations.walk)

        if (this.sprintEnabled) {
            if (this.turnDirection) {
                if (this.isSprinting && this.movingForward) this.setAnimation(this.animations.sprint)
                if (!this.movingForward) this.setAnimation(this.animations.walk)
            }
            this.isSprinting ? this.startSprinting() : this.stopSprinting();
        }

        if (this.movingForward || this.movingBackward) {
            this.move(this.movingForward)
            if (this.movingForward) this.setAnimation(this.animations.walk);
            if (this.movingBackward) this.setAnimation(this.animations.walk, true);
        }

        if (this.turnDirection) {
            this.turnSmoothly(deltaSec);
            this.setAnimation(this.animations.walk);
        }

        if (!this.movingForward && !this.movingBackward) {
            this.stopMovement();
        }


    },

    turnSmoothly(deltaSec) {
        const dir = this.turnDirection === 'right' ? -1 : 1;
        this.currentRotation = (this.currentRotation + dir * this.rotationSpeed * deltaSec + 360) % 360;

        const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
        this.rotateCharacterSmoothly(angleRad)
    },

    // TARGET WALK

    moveToTarget() {
        if (!this.reachTarget) {
            this.setAnimation(this.animations.walk)
            const direction = new AFRAME.THREE.Vector3().subVectors(this.targetPosition, this.el.object3D.position).normalize();
            this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, 0, direction.z * this.speed));
        }
    },

    checkReachedTarget() {
        const currentPos = this.el.object3D.position;
        const targetPos = this.targetPosition;

        const dx = currentPos.x - targetPos.x;
        const dz = currentPos.z - targetPos.z;

        const distanceXZ = Math.sqrt(dx * dx + dz * dz);

        if (distanceXZ < 0.5) {
            this.reachTarget = true;
        }
    },

    setTargetPosition(event) {
        this.reachTarget = false
        const mouse = new AFRAME.THREE.Vector2()
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        const raycaster = new AFRAME.THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.scene.object3D.children);
        this.targetPosition = intersects[0].point
    },

    setRotationToTarget() {
        const currentPos = this.el.object3D.position;
        const targetPos = this.targetPosition;

        const dx = targetPos.x - currentPos.x;
        const dz = targetPos.z - currentPos.z;

        const targetAngleRad = Math.atan2(dx, dz);
        const targetAngleDeg = THREE.MathUtils.radToDeg(targetAngleRad);

        this.rotationToTarget = (targetAngleDeg + 360) % 360;
    },

    rotateToTarget(deltaSec) {
        this.setRotationToTarget()
        this.setAnimation(this.animations.walk)

        const current = this.currentRotation;
        const target = this.rotationToTarget;

        let diff = ((target - current + 540) % 360) - 180;

        const maxStep = this.rotationSpeed * deltaSec;

        if (Math.abs(diff) <= maxStep) {
            this.currentRotation = target;
        } else {
            this.currentRotation = (current + Math.sign(diff) * maxStep + 360) % 360;
        }

        const angleRad = THREE.MathUtils.degToRad(this.currentRotation);

        this.rotateCharacterSmoothly(angleRad);
    }

})