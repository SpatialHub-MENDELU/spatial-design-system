import { isPositiveNumber, isValidGameKey } from "../../utils/gameUtils";

AFRAME.registerComponent("gameview", {
    schema: {
        target: {type: "selector"},
        height: {type: "number", default: 5},
        distance: {type: "number", default: 5},
        tilt: {type: "number", default: -20},
        type: {type: "string", default: "thirdPersonFixed"}, // "quarterTurn", "thirdPersonFixed", "thirdPersonFollow", "fixed"

        zoom: {type: "boolean", default: true},
        zoomSpeed: {type: "number", default: 0.3},
        minDistance: {type: "number", default: 2},
        maxDistance: {type: "number", default: 15},

        // only for quarter-turn
        rotationSpeed : {type: "number", default: 5},
        keyTurnLeft: {type: "string", default: "q"},
        keyTurnRight: {type: "string", default: "e"},

        // fixed
        position: {type: "string", default: "0 10 0"},
        rotation: {type: "string", default: "-30 0 0"},
    },

    init() {
        this.targetNeededTypes = ['thirdPersonFollow', 'thirdPersonFixed', 'quarterTurn'];
        this.isTargetNeeded = this.targetNeededTypes.includes(this.data.type);

        this.zoom = this.data.zoom
        this.minDistance = this.data.minDistance
        this.maxDistance = this.data.maxDistance

        // types of cameras
        this.thirdPersonFixed = false
        this.thirdPersonFollow = false
        this.quarterTurn = false
        this.target = false

        this.cameraPosition = new THREE.Vector3();
        this.cameraRotation = new THREE.Euler();

        this.wrongInput = false
        this.checkInputs()
        if(this.wrongInput) return

        this.type = this.data.type
        this.setType()

        this.cameraPosition = this.parsePosition()
        this.cameraRotation = this.parseRotation()

        if(this.thirdPersonFixed || this.quarterTurn || this.thirdPersonFollow) this.target = this.data.target?.object3D;

        this.previousTargetPosition = new THREE.Vector3();

        // quarter turn
        this.rotationSpeed = this.data.rotationSpeed;
        this.angle = 0;
        this.targetAngle = 0;
        this.keyTurnLeft = this.data.keyTurnLeft.toLowerCase()
        this.keyTurnRight = this.data.keyTurnRight.toLowerCase()

        this.bindKeyEvents();
        if (this.fixed) this.setCameraPositionAndRotation();
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

        document.addEventListener("wheel", (e) => {
            if (this.zoom) this.handleZoom(e);
        });
    },

    handleQuarterTurnInput(e) {
        if (e.key.toLowerCase() === this.keyTurnLeft) this.targetAngle += 90;
        if (e.key.toLowerCase() === this.keyTurnRight) this.targetAngle -= 90;
        this.targetAngle = (this.targetAngle + 360) % 360;
        this.updateOffsetPosition();
    },

    handleZoom(e) {
        const delta = Math.sign(e.deltaY) * this.data.zoomSpeed;

        if (this.isTargetNeeded) {
            this.handleTargetZoom(delta);
        } else {
            this.handleFixedZoom(delta);
        }
    },

    handleTargetZoom(delta) {
        const currentRatio = this.data.distance !== 0 ? this.data.height / this.data.distance : 0;
        let newDistance = this.data.distance + delta;

        newDistance = Math.min(Math.max(newDistance, this.minDistance), this.maxDistance);

        if (newDistance === this.data.distance) return;

        this.data.distance = newDistance;

        if (currentRatio !== 0) {
            this.data.height = newDistance * currentRatio;
        }

        if (!this.thirdPersonFollow) {
            this.updateOffsetPosition();
        }
    },

    handleFixedZoom(delta) {
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(this.el.object3D.quaternion);

        this.el.object3D.position.addScaledVector(direction, delta);

        this.cameraPosition.copy(this.el.object3D.position);
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
            if (this.isTargetNeeded && !this.data.target?.object3D) {
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
        if (oldData.position !== this.data.position) {
            this.cameraPosition = this.parsePosition();
            this.setCameraPositionAndRotation()
        }
        if (oldData.rotation !== this.data.rotation) {
            this.cameraRotation = this.parseRotation();
            this.setCameraPositionAndRotation()
        }
        if (oldData.zoom !== this.data.zoom) this.zoom = this.data.zoom
        if (oldData.minDistance !== this.data.minDistance) this.minDistance = this.data.minDistance
        if (oldData.maxDistance !== this.data.maxDistance) this.maxDistance = this.data.maxDistance
    },

    isValidCameraType(type) {
        const validTypes = ['thirdPersonFollow', 'thirdPersonFixed', 'quarterTurn', 'fixed'];
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
            case 'fixed':
                this.fixed = true
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

    parsePosition() {
        const posArray = this.data.position.split(" ").map(parseFloat);
        if (posArray.length !== 3 || posArray.some(isNaN)) {
            console.error(`Invalid position format: "${this.data.position}". Expected format: "x y z" with numeric values. Setting default position (0, 10, 0).`);
            return new THREE.Vector3(0, 10, 0);
        }
        return new THREE.Vector3(posArray[0], posArray[1], posArray[2]);
    },

    parseRotation() {
        const rotArray = this.data.rotation.split(" ").map(parseFloat);
        if (rotArray.length !== 3 || rotArray.some(isNaN)) {
            console.error(`Invalid rotation format: "${this.data.rotation}". Expected format: "x y z" with numeric values. Setting default rotation (-30, 0, 0).`);
            return new THREE.Euler(
                THREE.MathUtils.degToRad(0),
                THREE.MathUtils.degToRad(-30),
                THREE.MathUtils.degToRad(0)
            );
        }
        return new THREE.Euler(
            THREE.MathUtils.degToRad(rotArray[0]),
            THREE.MathUtils.degToRad(rotArray[1]),
            THREE.MathUtils.degToRad(rotArray[2])
        );
    },

    setCameraPositionAndRotation() {
        this.applyTransform(
            this.cameraPosition.x,
            this.cameraPosition.y,
            this.cameraPosition.z,
            this.cameraRotation.x,
            this.cameraRotation.y,
            this.cameraRotation.z
        )
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CAMERA TYPES METHODS

    updateOffsetPosition() {
        if(this.thirdPersonFollow || this.fixed) return;

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