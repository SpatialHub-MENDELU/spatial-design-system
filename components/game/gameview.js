import { isPositiveNumber, isValidGameKey } from "../../utils/gameUtils";


AFRAME.registerComponent("gameview", {
    schema: {
        target: {type: "selector"},
        height: {type: "number", default: 1},
        distance: {type: "number", default: 1},
        tilt: {type: "number", default: -15},
        type: {type: "string", default: "thirdPersonFixed"}, // "quarterTurn", "thirdPersonFixed", "thirdPersonFollow"

        // only for quarter-turn
        rotationSpeed : {type: "number", default: 5},
        keyTurnLeft: {type: "string", default: "q"},
        keyTurnRight: {type: "string", default: "e"},
    },

    init() {
        this.targetNeededTypes = ['thirdPersonFollow', 'thirdPersonFixed', 'quarterTurn'];
        this.isTargetNeeded = this.targetNeededTypes.includes(this.data.type);

        // types of cameras
        this.thirdPersonFixed = false
        this.thirdPersonFollow = false
        this.quarterTurn = false

        this.wrongInput = false
        this.checkInputs()
        if(this.wrongInput) return

        this.type = this.data.type
        this.setType()

        if(this.thirdPersonFixed || this.quarterTurn || this.thirdPersonFollow) this.target = this.data.target?.object3D;

        this.previousTargetPosition = new THREE.Vector3();

        // quarter turn
        this.rotationSpeed = this.data.rotationSpeed;
        this.angle = 0;
        this.targetAngle = 0;
        this.keyTurnLeft = this.data.keyTurnLeft.toLowerCase()
        this.keyTurnRight = this.data.keyTurnRight.toLowerCase()

        this.bindKeyEvents();
        this.updateOffsetPosition();
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // GENERAL METHODS

    tick() {
        if (this.isTargetNeeded && !this.target) return;

        if (this.thirdPersonFollow) this.trackTargetRotation();
        if (this.quarterTurn) this.animateRotationStep();
        if (this.thirdPersonFixed) this.followTargetIfMoved();
    },


    bindKeyEvents() {
        document.addEventListener("keydown", (e) => {
            if (this.quarterTurn) this.handleQuarterTurnInput(e)
        })
    },

    handleQuarterTurnInput(e) {
        if (e.key.toLowerCase() === this.keyTurnLeft) this.targetAngle += 90;
        if (e.key.toLowerCase() === this.keyTurnRight) this.targetAngle -= 90;
        this.targetAngle = (this.targetAngle + 360) % 360;
        this.updateOffsetPosition();
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CHECK INPUTS & UPDATE

    checkInputs() {
        if (!isPositiveNumber(this.data.height, 'height')) this.wrongInput = true
        if (!isPositiveNumber(this.data.rotationSpeed, 'rotationSpeed')) this.wrongInput = true
        if (!this.isValidCameraType(this.data.type)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyTurnLeft)) this.wrongInput = true
        if (!isValidGameKey(this.data.keyTurnRight)) this.wrongInput = true

        if (!this.wrongInput) {
            const needsTarget = ['thirdPersonFollow', 'thirdPersonFixed', 'quarterTurn'].includes(this.data.type);
            if (needsTarget && !this.data.target?.object3D) {
                console.error("Target is missing or invalid.");
                this.wrongInput = true;
            }
        }
    },

    update(oldData) {
        this.wrongInput = false
        this.checkInputs()
        if(this.wrongInput) return

        if (oldData.type !== this.data.type) {
            this.setType()
            this.type = this.data.type;
            this.isTargetNeeded = this.targetNeededTypes.includes(this.data.type);
            this.updateOffsetPosition();
        }

        if (oldData.target !== this.data.target) {
            this.target = this.data.target ? this.data.target.object3D : null;
        }
        if (oldData.height !== this.data.height) this.height = this.data.height
        if (oldData.distance !== this.data.distance) this.distance = this.data.distance
        if (oldData.tilt !== this.data.tilt) this.tilt = this.data.tilt
        if (oldData.rotationSpeed !== this.data.rotationSpeed) this.rotationSpeed = this.data.rotationSpeed
        if (oldData.keyTurnLeft !== this.data.keyTurnLeft) this.keyTurnLeft = this.data.keyTurnLeft.toLowerCase()
        if (oldData.keyTurnRight !== this.data.keyTurnRight) this.keyTurnRight = this.data.keyTurnRight.toLowerCase()

    },

    isValidCameraType(type) {
        const validTypes = ['thirdPersonFollow', 'thirdPersonFixed', 'quarterTurn'];
        const isValid = validTypes.includes(type);
        if (!isValid) {
            console.error(`Invalid camera type: ${type}. Valid types are: ${validTypes.join(', ')}.`);
        }
        return isValid;
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // SET METHODS

    setType() {
        this.thirdPersonFixed = false;
        this.quarterTurn = false;
        this.thirdPersonFollow = false;

        switch(this.data.type) {
            case 'thirdPersonFixed':
                this.thirdPersonFixed = true
                break;
            case 'quarterTurn':
                this.quarterTurn = true
                break;
            case 'thirdPersonFollow':
                this.thirdPersonFollow = true
                break;
            default:
                this.thirdPersonFixed = true
                break
        }
    },

    applyTransform(x, y, z, rotX, rotY, rotZ) {
        this.el.object3D.position.set(x, y, z);
        this.el.object3D.rotation.set(rotX, rotY, rotZ);
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CAMERA TYPES METHODS

    updateOffsetPosition() {
        if(this.thirdPersonFollow) return;

        const { x, y, z } = this.target.position;
        const { height, distance, tilt } = this.data;

        if (this.thirdPersonFixed) this.updateCameraThirdPersonFixed(x, y, z, height, distance, tilt);

        if (this.quarterTurn) this.updateCameraQuarterTurn(x, y, z, height, distance, tilt);
    },


    followTargetIfMoved() {
        const currentPosition = this.target.position;
        if (!this.previousTargetPosition.equals(currentPosition)) {
            this.updateOffsetPosition();
            this.previousTargetPosition.copy(currentPosition);
        }
    },

    // third-person-fixed

    updateCameraThirdPersonFixed(x, y, z, height, distance, tilt) {
        this.applyTransform(
            x,
            y + height,
            z + distance,
            THREE.MathUtils.degToRad(tilt),
            0,
            0
        )
    },

    // third-person-follow

    trackTargetRotation() {
        const { x, y, z } = this.target.position;
        const targetRotationY = this.target.rotation.y;

        const rotationFlippedY = targetRotationY + Math.PI;

        const offsetX = Math.sin(rotationFlippedY) * this.data.distance;
        const offsetZ = Math.cos(rotationFlippedY) * this.data.distance;

        const tiltRad = THREE.MathUtils.degToRad(this.data.tilt);

        this.applyTransform(
            x + offsetX,
            y + this.data.height,
            z + offsetZ,
            tiltRad,
            rotationFlippedY,
            0
        )

    },

    // quarter turn
    animateRotationStep() {
        let diff = this.targetAngle - this.angle;

        diff = ((diff + 540) % 360) - 180;

        if (Math.abs(diff) > 0.1) {
            const step = Math.sign(diff) * Math.min(Math.abs(diff), this.rotationSpeed);
            this.angle = (this.angle + step + 360) % 360;
            this.updateOffsetPosition();
        }

        this.followTargetIfMoved();
    },

    updateCameraQuarterTurn(x, y, z, height, distance, tilt) {
        const radiansY = THREE.MathUtils.degToRad(this.angle);
        const radiansTilt = THREE.MathUtils.degToRad(tilt);

        const offsetX = Math.sin(radiansY) * distance;
        const offsetZ = Math.cos(radiansY) * distance;

        this.applyTransform(
            x + offsetX,
            y + height,
            z + offsetZ,
            radiansTilt,
            radiansY,
            0
        )
    },

});