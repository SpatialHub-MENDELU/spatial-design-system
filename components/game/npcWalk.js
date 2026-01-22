import {doesGLTFAnimationExist, isPositiveNumber} from "../../utils/gameUtils";

AFRAME.registerComponent('npc-walk', {
    schema: {
        walkClipName: {type: "string", default: "Walk"}, // Name of the animation clip used when the NPC is walking.
        idleClipName: {type: "string", default: "Idle"}, // Name of the animation clip used when the NPC is idle.

        speed: {type: "number", default: 4}, // Movement speed of the NPC
        altitude: {type: "boolean", default: false}, // If true, the character adjusts its height to reach the target’s exact position; if false, it only moves horizontally and keeps its current height.
        pauseAtPoints: {type: "number", default: 0}, // Duration (in seconds) the NPC waits after reaching each point.
        waitBeforeStart: {type: "number", default: 0}, // Duration (in seconds) before the NPC begins moving when initialized.

        allowRotation: {type: "boolean", default: true}, // If true, it allows the NPC to rotate smoothly in the direction of movement.
        rotationSpeed: {type: "number", default: 500}, // Speed at which the NPC rotates toward its walking direction

        type: {type: "string", default: "points"}, // "points" or "randomMoving". The randomMoving enables random walking within the defined range area. The points type is walking through defined points defined in the points property.

        pointTolerance: {type: "number", default: 0.2}, // Tolerance distance to consider the NPC has reached the target position.

        // POINTS TYPE
        points: {type: "string", default: "0 1 5, 5 1 5, 5 1 0"}, // Array of positions the NPC walks through in order.
        cyclePath: {type: "boolean", default: true}, // If true, the NPC loops back to the first point after reaching the last one, forming a continuous cycle. If false, the NPC returns to the first point by traversing the points in reverse order.
        randomizePointsOrder: {type: "boolean", default: false}, // If true, the NPC visits defined points in "points" in a random sequence instead of the defined order.
        stopAtLastPoint: {type: "boolean", default: false}, // If true, the NPC stops moving after reaching the last point in the sequence.

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
        this.altitude = this.data.altitude

        this.pointTolerance = this.data.pointTolerance

        this.waitBeforeStart = false
        this.waitingBeforeStartsDuration = this.data.waitBeforeStart

        this.pauseAtPoints = false
        this.pauseAtPointsDuration = this.data.pauseAtPoints
        this.isWaiting = false

        this.rotationSpeed = this.data.rotationSpeed
        this.allowRotation = this.data.allowRotation
        this.rotationToTarget = null

        this.pointToPointType = false
        this.pointsType = false
        this.randomMovingType = false

        this.wrongInput = false
        this.targetPosition = null
        this.positionReached = false

        this.currentIndex = 0

        // POINTS
        this.pointsArray = this.parsePoints()
        this.arrayDirection = 1 // 1 for forward, -1 for backward
        this.cyclePath = this.data.cyclePath
        this.randomizePointsOrder = this.data.randomizePointsOrder

        this.stopAtLastPoint = this.data.stopAtLastPoint
        this.isFinished = false

        // RANDOM MOVING
        this.xMin = this.data.xMin;
        this.xMax = this.data.xMax;
        this.zMin = this.data.zMin;
        this.zMax = this.data.zMax;
        this.yMin = this.data.yMin;
        this.yMax = this.data.yMax;

        // SET INITIAL VALUES
        if (this.stopAtLastPoint) this.randomizePointsOrder = false
        this.checkInput()
        if (this.wrongInput) return

        this.setType()
        this.initializeDelays()
        this.setPositions()

        if (this.waitBeforeStart) this.setAnimation(this.animations.idle);
        else this.setAnimation(this.animations.walk);

    },

    update(oldData) {
        this.checkInput()
        if (this.wrongInput) return;

        // animations
        if (oldData.walkClipName !== this.data.walkClipName) this.animations.walk = this.data.walkClipName
        if (oldData.idleClipName !== this.data.idleClipName) this.animations.idle = this.data.idleClipName

        // movement
        if (oldData.speed !== this.data.speed) this.speed = this.data.speed
        if (oldData.altitude !== this.data.altitude) this.altitude = this.data.altitude
        if (oldData.pauseAtPoints !== this.data.pauseAtPoints) this.pauseAtPointsDuration = this.data.pauseAtPoints
        if (oldData.waitBeforeStart !== this.data.waitBeforeStart) this.waitingBeforeStartsDuration = this.data.waitBeforeStart

        if (oldData.rotationSpeed !== this.data.rotationSpeed) this.rotationSpeed = this.data.rotationSpeed
        if (oldData.allowRotation !== this.data.allowRotation) this.allowRotation = this.data.allowRotation

        if (oldData.type !== this.data.type) {
            this.setType()
            this.setPositions()
        }

        if (oldData.pointTolerance !== this.data.pointTolerance) this.pointTolerance = this.data.pointTolerance

        if (oldData.cyclePath !== this.data.cyclePath) this.cyclePath = this.data.cyclePath
        if (oldData.randomizePointsOrder !== this.data.randomizePointsOrder) this.randomizePointsOrder = this.data.randomizePointsOrder
        if (oldData.stopAtLastPoint !== this.data.stopAtLastPoint) {
            this.stopAtLastPoint = this.data.stopAtLastPoint
            if (this.stopAtLastPoint) this.randomizePointsOrder = false
        }

        // random moving type
        if (oldData.xMin !== this.data.xMin) this.xMin = this.data.xMin
        if (oldData.xMax !== this.data.xMax) this.xMax = this.data.xMax
        if (oldData.zMin !== this.data.zMin) this.zMin = this.data.zMin
        if (oldData.zMax !== this.data.zMax) this.zMax = this.data.zMax
        if (oldData.yMin !== this.data.yMin) this.yMin = this.data.yMin
        if (oldData.yMax !== this.data.yMax) this.yMax = this.data.yMax

        // points

        if (this.data.type === "points") {
            if (oldData.points !== this.data.points) {
                if (this.parsePoints() !== null) {
                    this.pointsArray = this.parsePoints()
                    this.checkPointsInput()
                    if (this.wrongInput) return
                    this.setPositions();
                }
            }
        }
    },

    parsePoints() {
        const pointsString = this.data.points;

        if (typeof pointsString !== "string") {
            console.error("Points data must be a string.");
            return null;
        }

        return pointsString
            .split(",")
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map((p, index) => {
                const coords = p.split(" ").map(Number);

                if (coords.length !== 3 || coords.some(isNaN)) {
                    this.wrongInput = true;
                    console.error("Invalid points input. Expected format: 'x y z, x y z, ...'");
                    return null;
                } else {
                    const [x, y, z] = coords;
                    return { x, y, z };
                }
            })
            .filter(Boolean);
    },

    tick(time, deltaTime) {
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
        if (!isPositiveNumber(this.data.pauseAtPoints, "pauseAtPoints", true)) this.wrongInput = true
        if (!isPositiveNumber(this.data.waitBeforeStart, "waitBeforeStart", true)) this.wrongInput = true

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
                break;
        }
    },

    moveToPosition(targetPosition) {
        const currentVelocity = this.el.body.getLinearVelocity();
        if (!this.positionReached) {
            const direction = new AFRAME.THREE.Vector3().subVectors(targetPosition, this.el.object3D.position).normalize();
            if (this.altitude) {
                this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, direction.y, direction.z * this.speed));
            } else {
                this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, currentVelocity.y(), direction.z * this.speed));
            }
        }
    },

    checkReachedPosition(targetPosition) {
        const currentPosition = this.el.object3D.position;
        if (this.altitude) {
            if (currentPosition.distanceTo(targetPosition) < this.pointTolerance) this.positionReached = true;
        } else {
            const dx = currentPosition.x - targetPosition.x;
            const dz = currentPosition.z - targetPosition.z;
            const distanceXZ = Math.sqrt(dx * dx + dz * dz);

            if (distanceXZ < this.pointTolerance) {
                this.positionReached = true;
            }
        }
    },

    setRotationToTarget() {
        const transform = this.el.body.getWorldTransform();
        const currPos = transform.getOrigin();
        const targetPosition = this.targetPosition;

        const dx = targetPosition.x - currPos.x();
        const dz = targetPosition.z - currPos.z();

        const targetAngleRad = Math.atan2(dx, dz);
        const targetAngleDeg = THREE.MathUtils.radToDeg(targetAngleRad);

        this.rotationToTarget = (targetAngleDeg + 360) % 360;
    },

    rotateToPosition(targetPosition, deltaSec) {
        if (!this.allowRotation) return;

        this.setRotationToTarget();
        const targetRotation = this.rotationToTarget;

        const transform = this.el.body.getWorldTransform();
        const ammoQuat = transform.getRotation();
        const threeQuat = new THREE.Quaternion(ammoQuat.x(), ammoQuat.y(), ammoQuat.z(), ammoQuat.w());

        const euler = new THREE.Euler().setFromQuaternion(threeQuat, 'YXZ');
        const currentRotation = (THREE.MathUtils.radToDeg(euler.y) + 360) % 360;

        let diff = ((targetRotation - currentRotation + 540) % 360) - 180;

        const maxStep = this.rotationSpeed * deltaSec;

        let newRotationDeg;
        if (Math.abs(diff) <= maxStep) {
            newRotationDeg = targetRotation;
        } else {
            newRotationDeg = (currentRotation + Math.sign(diff) * maxStep + 360) % 360;
        }

        const angleRad = THREE.MathUtils.degToRad(newRotationDeg);
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
        if (this.isFinished) return;
        if (this.pointsType) this.setNextTargetPosition();
        if (this.randomMovingType) this.targetPosition = this.generateRandomPosition();
        if (!this.isFinished) this.positionReached = false;
    },

    pointsMovement(deltaSec) {
        if (this.isWaiting || this.isFinished) return;

        if (!this.positionReached) {
            this.checkReachedPosition(this.targetPosition)
            if (this.allowRotation) this.rotateToPosition(this.targetPosition, deltaSec);
            this.moveToPosition(this.targetPosition);
        } else {
            if (this.pauseAtPoints) {
                this.isWaiting = true;
                this.setAnimation(this.animations.idle);

                setTimeout(() => {
                    this.setTargetPosition()

                    if (!this.isFinished) {
                        this.isWaiting = false;
                        this.setAnimation(this.animations.walk);
                    }
                }, this.pauseAtPointsDuration * 1000);
            } else this.setTargetPosition()

        }
    },

    // POINTS

    checkPointsInput() {
        if (this.pointsArray === null) {
            this.wrongInput = true
            return
        }

        if (this.pointsArray.length < 2) {
            this.wrongInput = true
            console.error("Wrong input for points. Expected array with at least two objects with x, y, z properties. Expected format: 'x y z, x y z, ...'");
            return
        }

        if (this.pointsArray.length === 2) this.pointToPointType = true
    },

    setPointsPositions() {
        this.targetPosition = this.convertObjectToVector3Array(this.pointsArray[0]);
        this.currentIndex = 0;
    },

    setNextTargetPosition() {
        this.setNewIndex()
        if (!this.isFinished) {
            this.targetPosition = this.convertObjectToVector3Array(this.pointsArray[this.currentIndex]);
        }
    },

    setNewIndex() {
        if (this.stopAtLastPoint) { // stop at last point
            if (this.currentIndex >= this.pointsArray.length - 1) {
                this.isFinished = true;
                this.setAnimation(this.animations.idle);
                return
            }
            this.currentIndex++;
            return
        }

        if (this.pointToPointType) { // visit just two points
            this.currentIndex = (this.currentIndex === 0) ? 1 : 0;
            return;
        }

        if (this.randomizePointsOrder) { // visit points in random order
            let newIndex = this.currentIndex;

            while (newIndex === this.currentIndex && this.pointsArray.length > 1) {
                newIndex = Math.floor(Math.random() * this.pointsArray.length);
            }

            this.currentIndex = newIndex;
        } else if (this.cyclePath) { // cycle through points
            this.currentIndex++;
            if (this.currentIndex === this.pointsArray.length) {
                this.currentIndex = 0;
            }
        } else { // back and forth through points
            this.currentIndex += this.arrayDirection;

            if (this.currentIndex === this.pointsArray.length - 1 || this.currentIndex === 0) {
                this.arrayDirection *= -1;
            }
        }
    },

    // RANDOM MOVING

    checkRangeInput() {
        if (this.data.xMin > this.data.xMax) {
            this.wrongInput = true;
            console.error("Invalid range for x-axis: xMin should be less than xMax.");
        }
        if (this.data.zMin > this.data.zMax) {
            this.wrongInput = true;
            console.error("Invalid range for z-axis: zMin should be less than zMax.");
        }
        if (this.data.yMin > this.data.yMax) {
            this.wrongInput = true;
            console.error("Invalid range for y-axis: yMin should be less than yMax.");
        }
    },

    generateRandomPosition() {
        const currentPosition = this.el.object3D.position;

        if (this.altitude) {
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