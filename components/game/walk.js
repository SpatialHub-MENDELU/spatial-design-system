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

        turnType: {type: "string", default: "stepTurnCardinal"}, // smoothTurn, stepTurnDiagonal, stepTurnCardinal
        startMovingDirection: {type: "string", default: "down"}, // down, up, left, right,
        autoWalk: {type: "boolean", default: true},
        flyMode: {type: "boolean", default: false},
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

        this.autoWalk = this.data.autoWalk;
        this.flyMode = this.data.flyMode

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

        this.setAnimation(this.animations.idle);
        this.bindEvents();
        this.setTurnType()
    },

    setTurnType() {
        if (this.flyMode) return

        switch (this.data.turnType) {
            case 'smoothTurn':        this.smoothTurn = true; break;
            case "stepTurnDiagonal": this.stepTurnDiagonal = true; break;
            case "stepTurnCardinal": this.stepTurnCardinal = true; break;
            default: this.smoothTurn = true; break;
        }
    },

    bindEvents() {
        document.addEventListener("keydown", this.onKeyDown.bind(this));
        document.addEventListener("keyup", this.onKeyUp.bind(this));
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

        if(this.sprintEnabled && key === 'shift') {
            if(this.smoothTurn) {
                if (this.movingForward) this.isSprinting = true;
            }
            if(this.stepTurnDiagonal || this.stepTurnCardinal) {
                if (this.movingForward || this.movingBackward || this.movingLeft || this.movingRight) this.isSprinting = true;
            }
        }
    },

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === this.keys.left) {
            this.movingLeft = false;
            if(this.turnDirection === 'left') this.turnDirection = null;
        }
        if (key === this.keys.right) {
            this.movingRight = false
            if(this.turnDirection === 'right') this.turnDirection = null;
        }
        if (key === this.keys.up) this.movingForward = false;
        if (key === this.keys.down) this.movingBackward = false;

        if(this.sprintEnabled) {
            if (key === 'shift') this.isSprinting = false
            if(this.smoothTurn) if (this.isSprinting && !this.movingForward) this.isSprinting = false;
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
            if(this.smoothTurn) this.setSmoothTurnMoving(deltaSec)
            if(this.stepTurnDiagonal || this.stepTurnCardinal) {
                this.updateDirection();
                this.setSmoothStepTurn();
            }
            if(this.flyMode) {
                this.movingDirection = null
                this.updateDirection()
                this.move()
            }
            if(this.autoWalk) {
                this.move()
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
        let velocity = new Ammo.btVector3(0, 0, 0);
        const speed = this.speed;

        if(this.smoothTurn) {
            const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
            const factor = forward ? 1 : -1;
            const x = Math.sin(angleRad) * speed * factor;
            const z = Math.cos(angleRad) * speed * factor;
            velocity = new Ammo.btVector3(x, 0, z);
        }

        if(this.stepTurnDiagonal || this.stepTurnCardinal) {
            switch (this.movingDirection) {
                case 'up':        velocity.setValue(0, 0, -speed); break;
                case 'down':      velocity.setValue(0, 0, speed); break;
                case 'left':      velocity.setValue(-speed, 0, 0); break;
                case 'right':     velocity.setValue(speed, 0, 0); break;
                case 'upLeft':    velocity.setValue(-speed, 0, -speed); break;
                case 'upRight':   velocity.setValue(speed, 0, -speed); break;
                case 'downLeft':  velocity.setValue(-speed, 0, speed); break;
                case 'downRight': velocity.setValue(speed, 0, speed); break;
            }
        }

        if(this.flyMode) {
            if(this.autoWalk) velocity.setValue(0, 0, -speed);
            switch (this.movingDirection) {
                case 'up':        velocity.setValue(0, speed, -speed); break;
                case 'down':      velocity.setValue(0, -speed, -speed); break;
                case 'left':      velocity.setValue(-speed, 0, -speed); break;
                case 'right':     velocity.setValue(speed, 0, -speed); break;
            }
        }

        this.el.body.setLinearVelocity(velocity);
    },


    // SPRINT
    startSprinting() {
        let sprint = false
        if(this.smoothTurn)  if (this.movingForward) sprint = true;
        if(this.stepTurnDiagonal || this.stepTurnCardinal) sprint = true

        if(sprint) {
            this.speed = this.data.sprintSpeed;
            this.setAnimation(this.animations.sprint);
        }
    },

    stopSprinting() {
        this.speed = this.data.speed;
        if(this.smoothTurn) {
            if (this.movingForward || this.movingBackward || this.turnDirection) {
                this.setAnimation(this.animations.walk);
            } else {
                this.setAnimation(this.animations.idle);
            }
        }
        if(this.stepTurnDiagonal || this.stepTurnCardinal) {
            this.setAnimation(
                this.movingLeft || this.movingRight || this.movingForward || this.movingBackward
                    ? this.animations.walk
                    : this.animations.idle
            );
        }
    },

    // STEP TURN DIAGONAL && STEP TURN HORIZONTAL
    setSmoothStepTurn() {
        if(this.autoWalk) this.setAnimation(this.animations.walk);
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

        if(this.flyMode) {
            this.movingDirection = newDir
            return;
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
        if(this.stepTurnDiagonal) {
            if (diff > 4) diff -= 8;
            if (diff < -4) diff += 8;
        }
        if(this.stepTurnCardinal) {
            diff = diff >= 3 ? diff - 4 : diff;
            diff = diff <= -3 ? diff + 4 : diff;
        }

        this.rotationY += diff * angle;
        this.movingDirection = this.newDirection;

        if (diff === 0) return;

        this.characterModel.setAttribute('animation', {
            property: 'rotation',
            to: { x: 0, y: this.rotationY, z: 0 },
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
        if(this.autoWalk) this.setAnimation(this.animations.walk)

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
            this.turnSmoothly(deltaSec);
            this.setAnimation(this.animations.walk);
        }

        if(!this.movingForward && !this.movingBackward) {
            this.stopMovement();
        }


    },

    turnSmoothly(deltaSec) {
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

})