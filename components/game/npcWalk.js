AFRAME.registerComponent('npc-walk', {
    schema: {
        walkClipName: {type: "string", default: "*Walk*"},
        idleClipName: {type: "string", default: "*Idle*"},

        speed: {type: "number", default: 2},
        checkHeight: {type: "boolean", default: false},
        pauseAtPoints: {type: "number", default: 0},

        allowRotation: {type: "boolean", default: true},
        rotationSpeed: {type: "number", default: 200},

        type: {type: "string", default: "points"}, // points, randomMoving

        // POINTS TYPE
        points: {type: "array", default: [{x: 0, y: 1, z: 5}, {x: 5, y: 1, z: 5}, {x: 5, y: 1, z: 0}]},
        cyclePath: {type: "boolean", default: true}, // If true, the NPC loops back to the first point after reaching the last one, forming a continuous cycle. If false, the NPC returns to the first point by traversing the points in reverse order.
        randomizePointsOrder: {type: "boolean", default: false}, // If true, the NPC visits defined points in "points" in a random sequence instead of the defined order.

        // RANDOM MOVING TYPE
    },

    init() {
        // GENERAL
        this.characterModel = this.el.children[0];
        this.animations = {
            walk: this.data.walkClipName,
            idle: this.data.idleClipName,
        }

        this.speed = this.data.speed
        this.checkHeight = this.data.checkHeight

        this.rotationSpeed = this.data.rotationSpeed
        this.allowRotation = this.data.allowRotation
        this.rotationToTarget = null
        this.currentRotation = 90

        this.pointToPointType = false
        this.pointsType = false
        this.randomMovingType = false

        this.wrongInput = false
        this.targetPosition = null

        this.currentIndex = 0

        // POINTS
        this.pointsArray = this.data.points;
        this.arrayDirection = 1 // 1 for forward, -1 for backward

        // SET INITIAL VALUES
        this.setType()
        this.checkInput()
        if(!this.wrongInput) this.setPositions()

        this.setAnimation(this.animations.walk);

    },

    tick(deltaTime) {
        const deltaSec = deltaTime / 1000;

        if(this.wrongInput) return
        if(this.el.body) {
            if(this.pointsType) this.pointsMovement(deltaSec)
        }
    },

    setType() {
        switch (this.data.type) {
            case 'points': this.pointsType = true; break;
            case 'randomMoving': this.randomMovingType = true; break;
        }
    },

    checkInput() {
        switch (this.data.type) {
            case 'points': this.checkPointsInput(); break;
            // case 'randomMoving':  break;
        }
    },

    setAnimation(name) {
        if (!this.characterModel) return;
        this.characterModel.setAttribute('animation-mixer', {
            clip: name,
            crossFadeDuration: this.crossFadeDuration
        });
    },

    setPositions() {
        switch (this.data.type) {
            case 'points': this.setPointsPositions(); break;
            // case 'randomMoving':  break;
        }
    },

    moveToPosition(targetPosition) {
        const currentVelocity = this.el.body.getLinearVelocity();
        if(!this.positionReached) {
            const direction = new AFRAME.THREE.Vector3().subVectors(targetPosition, this.el.object3D.position).normalize();
            if(this.checkHeight) {
                this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, direction.y, direction.z * this.speed));
            } else {
                this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, currentVelocity.y(), direction.z * this.speed));
            }
        }
    },

    checkReachedPosition(targetPosition) {
        const currentPosition = this.el.object3D.position;
        if(this.checkHeight) {
            if( currentPosition.distanceTo(targetPosition) < 0.2 ) this.positionReached = true;
        } else {
            const dx = currentPosition.x - targetPosition.x;
            const dz = currentPosition.z - targetPosition.z;
            const distanceXZ = Math.sqrt(dx * dx + dz * dz);

            if (distanceXZ < 0.5) {
                this.positionReached = true;
            }
        }
    },

    setRotationToTarget() {
        const currPos = this.el.object3D.position;
        const targetPosition = this.targetPosition;

        const dx = targetPosition.x - currPos.x;
        const dz = targetPosition.z - currPos.z;

        const targetAngleRad = Math.atan2(dx, dz);
        const targetAngleDeg = THREE.MathUtils.radToDeg(targetAngleRad);

        this.rotationToTarget = (targetAngleDeg + 360) % 360;
    },

    rotateToPosition(targetPosition, deltaSec) {
        this.setRotationToTarget(targetPosition);
        if(!this.allowRotation) return;

        const currentRotation = this.currentRotation
        const targetRotation = this.rotationToTarget

        let diff = ((targetRotation - currentRotation + 540) % 360) - 180;

        const maxStep = this.rotationSpeed * deltaSec;

        if(Math.abs(diff) <= maxStep) {
            this.currentRotation = targetRotation;
        } else {
            this.currentRotation = (currentRotation + Math.sign(diff) * maxStep + 540) % 360;
        }

        const angleRad = THREE.MathUtils.degToRad(this.currentRotation);
        this.rotateCharacter(angleRad);
    },

    rotateCharacter(angleRad) {
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

    convertObjectToVector3Array(object) {
        return new THREE.Vector3(
            object.x,
            object.y,
            object.z
        );
    },

    // POINTS

    checkPointsInput() {
        this.wrongInput = false

        if(this.pointsArray.length < 2) {
            this.wrongInput = true
            console.warn("Wrong input for points. Expected array with at least two objects with x, y, z properties.")
            return
        }

        for (let i = 0; i < this.pointsArray.length; i++) {
            const point = this.pointsArray[i];
            if (point.x === null || point.y === null || point.z === null) {
                this.wrongInput = true;
                console.warn(`Wrong input for points. Point at index ${i} is missing x, y, or z property.`);
                return;
            }
        }

        if (this.pointsArray.length === 2) this.pointToPointType = true
    },

    setPointsPositions() {
        this.targetPosition = this.convertObjectToVector3Array(this.pointsArray[0]);
        this.currentIndex = 0;
    },

    setNextTargetPosition() {
        this.setNewIndex()
        this.targetPosition = this.convertObjectToVector3Array(this.pointsArray[this.currentIndex]);
    },

    setNewIndex () {
        if (this.pointToPointType) {
            this.currentIndex = (this.currentIndex === 0) ? 1 : 0;
            return;
        }

        if(this.data.randomizePointsOrder) {
            let newIndex = this.currentIndex;

            while (newIndex === this.currentIndex && this.pointsArray.length > 1) {
                newIndex = Math.floor(Math.random() * this.pointsArray.length);
            }

            this.currentIndex = newIndex;
        }

        else if(this.data.cyclePath) {
            this.currentIndex++;
            if(this.currentIndex === this.pointsArray.length) {
                this.currentIndex = 0;
            }
        }
        else {
            this.currentIndex += this.arrayDirection;

            if (this.currentIndex === this.pointsArray.length - 1 || this.currentIndex === 0) {
                this.arrayDirection *= -1;
            }
        }
    },

    pointsMovement(deltaSec) {
        if(!this.positionReached) {
            this.checkReachedPosition(this.targetPosition)
            if(this.allowRotation) this.rotateToPosition(this.targetPosition, deltaSec); // todo: rotate smoothly to target position
            this.moveToPosition(this.targetPosition);
        } else {
            this.setNextTargetPosition();
            this.positionReached = false;
        }
    },


})