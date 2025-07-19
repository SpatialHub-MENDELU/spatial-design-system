AFRAME.registerComponent('npc-walk', {
    schema: {
        walkClipName: {type: "string", default: "*Walk*"},
        idleClipName: {type: "string", default: "*Idle*"},

        speed: {type: "number", default: 2},
        checkHeight: {type: "boolean", default: false},
        pauseAtPoints: {type: "number", default: 0},

        allowRotation: {type: "boolean", default: true},
        rotationSpeed: {type: "number", default: 200},

        type: {type: "string", default: "pointToPoint"}, // pointToPoint, points, randomMoving

        pointToPoint: {type: "array", default: [{x: 0, y: 1, z: 5}, {x: 5, y: 1, z: 5}]},
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

        // POINT TO POINT
        this.pointToPointArray = this.data.pointToPoint;
        this.positionReached = false
        this.positionA = null
        this.positionB = null

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
            if(this.pointToPointType) this.pointToPointMovement(deltaSec)
        }
    },

    setType() {
        console.log("setting type")
        switch (this.data.type) {
            case 'pointToPoint': this.pointToPointType = true; break;
            case 'points': this.pointsType = true; break;
            case 'randomMoving': this.randomMovingType = true; break;
        }
    },

    checkInput() {
        console.log("checking input")
        switch (this.data.type) {
            case 'pointToPoint': this.checkPointToPointInput(); break;
            // case 'points':  break;
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
            case 'pointToPoint': this.setPointToPointPositions(); break;
            // case 'points':  break;
            // case 'randomMoving':  break;
        }
    },

    moveToPosition(targetPosition) {
        if(!this.positionReached) {
            const direction = new AFRAME.THREE.Vector3().subVectors(targetPosition, this.el.object3D.position).normalize();
            if(this.checkHeight) {
                this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, direction.y, direction.z * this.speed));
            } else {
                this.el.body.setLinearVelocity(new Ammo.btVector3(direction.x * this.speed, 0, direction.z * this.speed));
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

    // POINT TO POINT

    pointToPointMovement(deltaSec) {
        if(!this.positionReached) {
            this.checkReachedPosition(this.targetPosition)
            if(this.allowRotation) this.rotateToPosition(this.targetPosition, deltaSec); // todo: rotate smoothly to target position
            this.moveToPosition(this.targetPosition);
        } else {
            this.targetPosition = (this.targetPosition === this.positionA) ? this.positionB : this.positionA;
            this.positionReached = false;
        }
    },

    checkPointToPointInput() {
        console.log(this.pointToPointArray)
      this.wrongInput = false
      if (this.pointToPointArray.length !== 2) {
          this.wrongInput = true
      }
      else if(this.pointToPointArray[0].x === null ||
         this.pointToPointArray[0].y === null ||
         this.pointToPointArray[0].z === null ||
         this.pointToPointArray[1].x === null ||
         this.pointToPointArray[1].y === null ||
         this.pointToPointArray[1].z === null)
      {
        this.wrongInput = true
      }

        if(this.wrongInput) {
            console.warn("Wrong input for pointToPoint. Expected array with two objects with x, y, z properties. Example: [{x: 0, y: 1, z: 5}, {x: 5, y: 1, z: 5}]")
        }
    },

    setPointToPointPositions() {
        console.log("setting point to point positions")
        this.positionA = new THREE.Vector3(
            this.pointToPointArray[0].x,
            this.pointToPointArray[0].y,
            this.pointToPointArray[0].z
        );
        this.positionB = new THREE.Vector3(
            this.pointToPointArray[1].x,
            this.pointToPointArray[1].y,
            this.pointToPointArray[1].z
        );
        this.targetPosition = this.positionA
        console.log(this.positionA)
        console.log(this.positionB)
    }
})