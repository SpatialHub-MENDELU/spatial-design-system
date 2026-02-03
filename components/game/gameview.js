import { isPositiveNumber } from "../../utils/gameUtils";


AFRAME.registerComponent("gameview", {
    schema: {
        target: {type: "selector"},
        height: {type: "number", default: 1},
        distance: {type: "number", default: 1},
        tilt: {type: "number", default: -15},
        type: {type: "string", default: "thirdPersonFixed"}, // "quarterTurn", "thirdPersonFixed", "thirdPersonFollow"
        rotationSpeed : {type: "number", default: 5} // only for quarter-turn
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

        this.bindKeyEvents();
        this.updateCamera();
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // GENERAL METHODS

    tick() {
        if (this.isTargetNeeded && !this.target) return;

        if (this.thirdPersonFollow) this.updateThirdPersonFollow();
        if (this.quarterTurn) this.updateQuarterTurn();
        if (this.thirdPersonFixed) this.followTargetIfMoved();
    },


    bindKeyEvents() {
        document.addEventListener("keydown", (e) => {
            if (!this.quarterTurn) return;
            if (e.key === "e") this.targetAngle += 90;
            if (e.key === "q") this.targetAngle -= 90;
            this.targetAngle = (this.targetAngle + 360) % 360;
            this.updateCamera();
        })
    },

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CHECK INPUTS & UPDATE

    checkInputs() {
        if (!isPositiveNumber(this.data.height, 'height')) this.wrongInput = true
        if (!isPositiveNumber(this.data.rotationSpeed, 'rotationSpeed')) this.wrongInput = true
        if (!this.isValidCameraType(this.data.type)) this.wrongInput = true

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
            this.updateCamera();
        }

        if (oldData.target !== this.data.target) {
            this.target = this.data.target ? this.data.target.object3D : null;
        }
        if (oldData.height !== this.data.height) this.height = this.data.height
        if (oldData.distance !== this.data.distance) this.distance = this.data.distance
        if (oldData.tilt !== this.data.tilt) this.tilt = this.data.tilt
        if (oldData.rotationSpeed !== this.data.rotationSpeed) this.rotationSpeed = this.data.rotationSpeed

    },

    isValidCameraType(type) {
        const validTypes = ['thirdPersonFollow', 'thirdPersonFixed', 'quarterTurn'];
        console.error(`Invalid camera type: ${type}. Valid types are: ${validTypes.join(', ')}.`);
        return validTypes.includes(type);
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

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CAMERA TYPES METHODS

    updateCamera() {
        if(this.thirdPersonFollow) return;

        const { x, y, z } = this.target.position;
        const { height, distance, tilt } = this.data;

        if (this.thirdPersonFixed) {
            this.el.object3D.position.set(x, y + height, z + distance);
            this.el.object3D.rotation.set(
                THREE.MathUtils.degToRad(tilt),
                0,
                0
            );
        }

        if (this.quarterTurn) {
            const radiansY = THREE.MathUtils.degToRad(this.angle);
            const radiansTilt = THREE.MathUtils.degToRad(tilt);

            const offsetX = Math.sin(radiansY) * distance;
            const offsetZ = Math.cos(radiansY) * distance;

            this.el.object3D.position.set(
                x + offsetX,
                y + height,
                z + offsetZ
            );

            this.el.object3D.rotation.set(
                radiansTilt,
                radiansY,
                0
            );
        }
    },

    followTargetIfMoved() {
        const currentPosition = this.target.position;
        if (!this.previousTargetPosition.equals(currentPosition)) {
            this.updateCamera();
            this.previousTargetPosition.copy(currentPosition);
        }
    },

    // third-person-follow

    updateThirdPersonFollow() {
        const { x, y, z } = this.target.position;
        const targetRotationY = this.target.rotation.y;

        const rotationFlippedY = targetRotationY + Math.PI;

        const offsetX = Math.sin(rotationFlippedY) * this.data.distance;
        const offsetZ = Math.cos(rotationFlippedY) * this.data.distance;

        this.el.object3D.position.set(
            x + offsetX,
            y + this.data.height,
            z + offsetZ
        );

        const tiltRad = THREE.MathUtils.degToRad(this.data.tilt);

        this.el.object3D.rotation.set(
            tiltRad,
            rotationFlippedY,
            0
        );
    },

    // quarter turn
    updateQuarterTurn() {
        let diff = this.targetAngle - this.angle;
        if (this.quarterTurn) {
            diff = ((diff + 540) % 360) - 180;
        }

        if (Math.abs(diff) > 0.1) {
            const step = Math.sign(diff) * Math.min(Math.abs(diff), this.rotationSpeed);
            this.angle = (this.angle + step + 360) % 360;
            this.updateCamera();
        }

        this.followTargetIfMoved();
    },

});