

AFRAME.registerComponent("gameview", {
    schema: {
        target: {type: "selector"},
        height: {type: "number", default: 6},
        distance: {type: "number", default: 10},
        tilt: {type: "number", default: -30},
        type: {type: "string", default: "quarter-turn"},
    },

    init() {
        this.cameraTypes ={
            THIRD_PERSON_FIXED: "third-person-fixed",
            QUARTER_TURN: "quarter-turn",
        }

        const targetObject = this.data.target?.object3D;
        if (!targetObject) {
            console.warn("gameview: Target is missing or invalid.");
            return;
        }

        this.cameraType = this.data.type;

        this.targetObject = targetObject;
        this.previousTargetPosition = new THREE.Vector3();
        this.angle = 0;
        this.targetAngle = 0;
        this.rotationSpeed = 5;

        this.bindKeyEvents();
        this.updateCamera();

    },

    tick() {
        if (!this.targetObject) return;

        let diff = this.targetAngle - this.angle;
        
        if(this.cameraType === this.cameraTypes.QUARTER_TURN) {
            diff = ((diff + 540) % 360) - 180;
        }
        

        if (Math.abs(diff) > 0.1) {
            const step = Math.sign(diff) * Math.min(Math.abs(diff), this.rotationSpeed);
            this.angle = (this.angle + step + 360) % 360;
            this.updateCamera();
        }


        this.followTargetIfMoved();
    },

    updateCamera() {
        const { x, y, z } = this.targetObject.position;
        const { height, distance, tilt } = this.data;

        if(this.cameraType === this.cameraTypes.THIRD_PERSON_FIXED) {
            this.el.object3D.position.set(x, y + height, z + distance);
            this.el.object3D.rotation.set(
                THREE.MathUtils.degToRad(tilt),
                0,
                0
            );
        }

        if(this.cameraType === this.cameraTypes.QUARTER_TURN) {
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
        const currentPosition = this.targetObject.position;

        if (!this.previousTargetPosition.equals(currentPosition)) {
            this.updateCamera();
            this.previousTargetPosition.copy(currentPosition);
        }
    },

    bindKeyEvents() {
        document.addEventListener("keydown", (e) => {
            if(e.key === "e") this.targetAngle += 90;
            if(e.key === "q") this.targetAngle -= 90;

            this.targetAngle = (this.targetAngle + 360) % 360;
            this.updateCamera();
        })
    }
})