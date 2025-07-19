AFRAME.registerComponent('npc-walk', {
    schema: {
        walkClipName: {type: "string", default: "*Walk*"},
        idleClipName: {type: "string", default: "*Idle*"},

        speed: {type: "number", default: 2},
        rotationSpeed: {type: "number", default: 500},
        allowRotation: {type: "boolean", default: false},
        checkHeight: {type: "boolean", default: false},

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
        this.rotationSpeed = this.data.rotationSpeed
        this.allowRsotation = this.data.allowRotation
        this.checkHeight = this.data.checkHeight

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

    tick() {
        if(this.wrongInput) return
        if(this.el.body) {
            if(this.pointToPointType) this.pointToPointMovement()
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

    rotateToPosition(targetPosition) {
        // todo - add rotation to target position
    },

    // POINT TO POINT

    pointToPointMovement() {
        if(!this.positionReached) {
            this.checkReachedPosition(this.targetPosition)
            if(this.allowRotation) this.rotateToPosition(this.targetPosition)
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