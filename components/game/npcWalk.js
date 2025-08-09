import {doesGLTFAnimationExist, isPositiveNumber} from "../../utils/gameUtils";

AFRAME.registerComponent('npc-walk', {
    schema: {
        walkClipName: {type: "string", default: "*Walk*"},
        idleClipName: {type: "string", default: "*Idle*"},

        speed: {type: "number", default: 2},
        checkHeight: {type: "boolean", default: false},
        pauseAtPoints: {type: "number", default: 0},
        waitBeforeStart: {type: "number", default: 0},

        allowRotation: {type: "boolean", default: true},
        rotationSpeed: {type: "number", default: 200},

        type: {type: "string", default: "points"}, // points, randomMoving

        // POINTS TYPE
        points: {type: "array", default: [{x: 0, y: 1, z: 5}, {x: 5, y: 1, z: 5}, {x: 5, y: 1, z: 0}]},
        cyclePath: {type: "boolean", default: true}, // If true, the NPC loops back to the first point after reaching the last one, forming a continuous cycle. If false, the NPC returns to the first point by traversing the points in reverse order.
        randomizePointsOrder: {type: "boolean", default: false}, // If true, the NPC visits defined points in "points" in a random sequence instead of the defined order.

        // RANDOM MOVING TYPE
        xMin: {type: "number", default: -5}, // Minimum allowed position along the-axis(left boundary). Prevents the entity from moving too far left. Only used when type is set to randomMoving.
        xMax: {type: "number", default: 5}, // Maximum allowed position along the X-axis (right boundary). Prevents the entity from moving too far right. Only used when type is set to randomMoving.
        zMin: {type: "number", default: -5}, // Minimum allowed position along the Z-axis (backward boundary). Prevents the entity from moving too far backward. Only used when type is set to randomMoving.
        zMax: {type: "number", default: 5}, // Maximum allowed position along the Z-axis (forward boundary). Prevents the entity from moving too far forward. Only used when type is set to randomMoving.
        yMin: {type: "number", default: 0}, // Minimum allowed position along the Y-axis (downward boundary). Prevents the entity from moving too far down. Only used when type is set to randomMoving.
        yMax: {type: "number", default: 5}, // Maximum allowed position along the Y-axis (upward boundary). Prevents the entity from moving too far up. Only used when type is set to randomMoving.
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

        this.waitBeforeStart = false
        this.waitingBeforeStartsDuration = this.data.waitBeforeStart

        this.pauseAtPoints = false
        this.pauseAtPointsDuration = this.data.pauseAtPoints
        this.isWaiting = false

        this.rotationSpeed = this.data.rotationSpeed
        this.allowRotation = this.data.allowRotation
        this.rotationToTarget = null
        this.currentRotation = 90

        this.pointToPointType = false
        this.pointsType = false
        this.randomMovingType = false

        this.wrongInput = false
        this.targetPosition = null
        this.positionReached = false

        this.currentIndex = 0

        // POINTS
        this.pointsArray = this.data.points;
        this.arrayDirection = 1 // 1 for forward, -1 for backward

        // RANDOM MOVING
        this.xMin = this.data.xMin;
        this.xMax = this.data.xMax;
        this.zMin = this.data.zMin;
        this.zMax = this.data.zMax;
        this.yMin = this.data.yMin;
        this.yMax = this.data.yMax;

        // SET INITIAL VALUES
        this.checkInput()
        if (this.wrongInput) return

        this.setType()
        this.initializeDelays()
        this.setPositions()

        if (this.waitBeforeStart)  this.setAnimation(this.animations.idle);
        else this.setAnimation(this.animations.walk);

    },

    tick(deltaTime) {
        const deltaSec = deltaTime / 1000;

        if (this.wrongInput) return
        if (this.el.body) {
            if (!this.waitBeforeStart) this.pointsMovement(deltaSec)
        }
    },

    setType() {
        switch (this.data.type) {
            case 'points':
                this.pointsType = true;
                break;
            case 'randomMoving':
                this.randomMovingType = true;
                break;
        }
    },

    checkInput() {
        this.wrongInput = false;

        switch (this.data.type) {
            case 'points':
                this.checkPointsInput();
                break;
            case 'randomMoving':
                this.checkRangeInput();
                break;
        }

        this.el.addEventListener('model-loaded', (e) => {
            const model = e.detail.model;
            if (!doesGLTFAnimationExist(model, this.data.walkClipName)) this.wrongInput = true
            if (!doesGLTFAnimationExist(model, this.data.idleClipName)) this.wrongInput = true
        })

        if (!isPositiveNumber(this.data.speed, "speed")) this.wrongInput = true
        if (!isPositiveNumber(this.data.rotationSpeed, "rotationSpeed")) this.wrongInput = true
        if (!isPositiveNumber(this.data.pauseAtPoints, "pauseAtPoints")) this.wrongInput = true
        if (!isPositiveNumber(this.data.waitBeforeStart, "waitBeforeStart")) this.wrongInput = true

        if (!this.isValidType(this.data.type)) {
            this.wrongInput = true;
            console.error(`Invalid type "${this.data.type}". Expected "points" or "randomMoving".`);
        }
    },

    initializeDelays() {
        if (this.waitingBeforeStartsDuration > 0) {
            this.waitBeforeStart = true
            setTimeout(() => {
                this.waitBeforeStart = false;
                this.setAnimation(this.animations.walk);
            }, this.waitingBeforeStartsDuration * 1000);
        }

        if (this.pauseAtPointsDuration > 0) this.pauseAtPoints = true
    },

    isValidType(type) {
        return ['points', 'randomMoving'].includes(type);
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
            case 'points':
                this.setPointsPositions();
                break;
            case 'randomMoving':
                this.targetPosition = this.generateRandomPosition();
                console.log("Initial random position:", this.targetPosition);
                break;
        }
    },

    moveToPosition(targetPosition) {
        const currentVelocity = this.el.body.getLinearVelocity();
        if (!this.positionReached) {
            const direction = new AFRAME.THREE.Vector3().subVectors(targetPosition, this.el.object3D.position).normalize();
            if (this.checkHeight) {
                this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, direction.y, direction.z * this.speed));
            } else {
                this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, currentVelocity.y(), direction.z * this.speed));
            }
        }
    },

    checkReachedPosition(targetPosition) {
        const currentPosition = this.el.object3D.position;
        if (this.checkHeight) {
            if (currentPosition.distanceTo(targetPosition) < 0.2) this.positionReached = true;
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
        if (!this.allowRotation) return;

        const currentRotation = this.currentRotation
        const targetRotation = this.rotationToTarget

        let diff = ((targetRotation - currentRotation + 540) % 360) - 180;

        const maxStep = this.rotationSpeed * deltaSec;

        if (Math.abs(diff) <= maxStep) {
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

    setTargetPosition() {
        if (this.pointsType) this.setNextTargetPosition();
        if (this.randomMovingType) this.targetPosition = this.generateRandomPosition();
        this.positionReached = false;
    },

    pointsMovement(deltaSec) {
        if (this.isWaiting) return;

        if (!this.positionReached) {
            this.checkReachedPosition(this.targetPosition)
            if (this.allowRotation) this.rotateToPosition(this.targetPosition, deltaSec); // todo: rotate smoothly to target position
            this.moveToPosition(this.targetPosition);
        } else {
            if (this.pauseAtPoints) {
                this.isWaiting = true;
                this.setAnimation(this.animations.idle);

                setTimeout(() => {
                    this.setTargetPosition()

                    this.isWaiting = false;
                    this.setAnimation(this.animations.walk);
                }, this.pauseAtPointsDuration * 1000);
            } else this.setTargetPosition()

        }
    },

    // POINTS

    checkPointsInput() {
        this.wrongInput = false

        if (this.pointsArray.length < 2) {
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

    setNewIndex() {
        if (this.pointToPointType) {
            this.currentIndex = (this.currentIndex === 0) ? 1 : 0;
            return;
        }

        if (this.data.randomizePointsOrder) {
            let newIndex = this.currentIndex;

            while (newIndex === this.currentIndex && this.pointsArray.length > 1) {
                newIndex = Math.floor(Math.random() * this.pointsArray.length);
            }

            this.currentIndex = newIndex;
        } else if (this.data.cyclePath) {
            this.currentIndex++;
            if (this.currentIndex === this.pointsArray.length) {
                this.currentIndex = 0;
            }
        } else {
            this.currentIndex += this.arrayDirection;

            if (this.currentIndex === this.pointsArray.length - 1 || this.currentIndex === 0) {
                this.arrayDirection *= -1;
            }
        }
    },

    // RANDOM MOVING

    checkRangeInput() {
        this.wrongInput = false;
    },

    generateRandomPosition() {
        const currentPosition = this.el.object3D.position;

        if (this.checkHeight) {
            return new THREE.Vector3(
                THREE.MathUtils.randFloat(this.xMin, this.xMax),
                THREE.MathUtils.randFloat(this.yMin, this.yMax),
                THREE.MathUtils.randFloat(this.zMin, this.zMax)
            );
        } else {
            return new THREE.Vector3(
                THREE.MathUtils.randFloat(this.xMin, this.xMax),
                currentPosition.y,
                THREE.MathUtils.randFloat(this.zMin, this.zMax)
            );
        }

    },
})