import * as AFRAME from "aframe"
import { onSceneLoaded } from "../utils/utils"

AFRAME.registerComponent('billboard', {
    init() {
        this.element = this.el.object3D
        this.camera = this.el.sceneEl.camera
        this.cameraPos = new AFRAME.THREE.Vector3()
    },

    tick() {        
        this.camera.getWorldPosition(this.cameraPos)
        this.element.lookAt(this.cameraPos)
    }
})

AFRAME.registerComponent('auto-scale', {
    schema: {
        factor: { type: 'number', default: 1.0 },
        enabled: { type: 'boolean', default: true }
    },

    init() {
        this.originalScale = this.el.object3D.scale.clone()
        this.camera = this.el.sceneEl.camera
        this.cameraPos = new AFRAME.THREE.Vector3()

        this.captureInitialDistance()
        this.camera.el.addEventListener('loaded', () => this.captureInitialDistance())
    },

    tick() {
        if (!this.data.enabled) return

        if (this.el.components["fit-into-fov"]) {
            this.el.components["fit-into-fov"].setScale()
        } else {
            this.el.object3D.scale.copy(this.calculateNewScale())
        }
    },

    captureInitialDistance() {
        this.camera.getWorldPosition(this.cameraPos)
        this.initialDistance = this.cameraPos.distanceTo(this.el.object3D.position)
    },

    calculateNewScale() {
        if (!this.data.enabled) return null

        this.camera.getWorldPosition(this.cameraPos)

        const distance = this.cameraPos.distanceTo(this.el.object3D.position)
        const normalizedDistance = distance / this.initialDistance

        return this.originalScale.clone().multiplyScalar(normalizedDistance * this.data.factor)
    }

})

AFRAME.registerComponent('follow-camera', {
    schema: {
        distance: { type: "number", default: 2.0 },
        angle: { type: "number", default: 0.0 },
        duration: { type: "number", default: 500 },
        horizontal: { type: "boolean", default: false },
    },

    init() {
        this.camera = this.el.sceneEl.camera

        this.cameraPos = new AFRAME.THREE.Vector3()
        this.cameraDir = new AFRAME.THREE.Vector3()

        this.vecBetweenCameraAndEl = new AFRAME.THREE.Vector3()
        this.angleBetweenCameraAndEl = 0.0
        this.targetPos = new AFRAME.THREE.Vector3()

        this.initialElPosY = this.el.object3D.position.y

        // Default angle
        if (this.data.angle === 0.0) {
            this.data.angle = this.camera.fov * this.camera.aspect / 2
        }

        this.setupAnimation()
    },

    tick() {    
        this.camera.getWorldPosition(this.cameraPos)
        this.camera.getWorldDirection(this.cameraDir)
        
        this.vecBetweenCameraAndEl
            = this.el.object3D.position.clone()
                .sub(this.cameraPos).multiplyScalar(1)

        this.angleBetweenCameraAndEl = this.vecBetweenCameraAndEl.angleTo(this.cameraDir) * (180 / Math.PI)
        
        const targetPos = this.cameraPos.clone().add(this.cameraDir.clone().multiplyScalar(this.data.distance))

        if (this.angleBetweenCameraAndEl > this.data.angle && this.targetPos.distanceTo(targetPos) > 0.1) {
            const y = this.data.horizontal ? this.initialElPosY : targetPos.y

            this.el.setAttribute("animation__follow-camera", "to", `${targetPos.x} ${y} ${targetPos.z}`)
            this.targetPos = targetPos.clone()
        }
    },

    setupAnimation() {
        this.el.setAttribute("animation__follow-camera", {
            "property": "position",
            "to": this.el.object3D.position,
            "dur": this.data.duration,
            "easing": "linear",
            "loop": false
        })
    }
})

AFRAME.registerComponent('auto-position', {
    schema: {
        hAlign: { type: "string", default: "center" },
        vAlign: { type: "string", default: "center" },
        zIndex: { type: "number", default: 0 }
    },

    init() {
        this.validateSchema()
        onSceneLoaded(this.el.sceneEl, () => {
            this.setElAndParentBoundingBox()
            this.setElAlignment()
        })
    },

    validateSchema() {
        const hAlignOptions = { left: "left", center: "center", right: "right" }
        const vAlignOptions = { top: "top", center: "center", bottom: "bottom" }

        this.hAlignment = this.data.hAlign?.toLowerCase()
        this.vAlignment = this.data.vAlign?.toLowerCase()
        
        if (!(this.hAlignment in hAlignOptions) || !(this.vAlignment in vAlignOptions)) {
            this.hAlignment = hAlignOptions.center
            this.vAlignment = vAlignOptions.center

            console.warn(`Warning auto-position: invalid align value(s) [${this.el.tagName}], set to default`)
        }

        this.data.zIndex = isNaN(this.data.zIndex) ? 0 : this.data.zIndex
    },
    
    setElAlignment() {
        let x = 0
        let y = 0

        if (this.hAlignment !== "center") {
            const sign = this.hAlignment === "right" ? 1 : -1;
            x = (this.parentBboxSize.x / 2 - this.elBboxSize.x / 2) * sign;
        }

        if (this.vAlignment !== "center") {
            const sign = this.vAlignment === "bottom" ? -1 : 1;
            y = (this.parentBboxSize.y / 2 - this.elBboxSize.y / 2) * sign;
        }

        this.el.object3D.position.x = x
        this.el.object3D.position.y = y
        this.el.object3D.position.z = this.data.zIndex
    },
    
    setElAndParentBoundingBox() {
        const elMesh = this.el.getObject3D("mesh")
        const parentMesh = this.el.parentNode.getObject3D("mesh")

        this.elBbox = new AFRAME.THREE.Box3().setFromObject(elMesh)
        this.elBboxSize = this.elBbox.getSize(new AFRAME.THREE.Vector3())
        
        this.parentBbox = new AFRAME.THREE.Box3().setFromObject(parentMesh)
        this.parentBboxSize = this.parentBbox.getSize(new AFRAME.THREE.Vector3())
    }
})

AFRAME.registerComponent('fit-into-fov', {
    schema: {
        margin: { type: "number", default: 0 },
        useFrontFace: { type: "boolean", default: false }
    },

    validateSchema() {
        // A-Frame returns `NaN`, if the value of property doesn't conform to type in schema
        // Example: fit-into-fov="margin: aaaa" will return `NaN` (default value won't be used)
        // Thus there is a below check
        if (isNaN(this.data.margin) || this.data.margin < 0) {
            console.warn("Warning fit-into-fov: margin must be a positive number")
            this.data.margin = 0
        }
    },

    init() {
        this.validateSchema()

        this.camera = this.el.sceneEl.camera
        this.el.object3D.scale.set(1, 1, 1)
        
        onSceneLoaded(this.el.sceneEl, () => {
            this.computeBBox()
            this.setScale()
            this.el.addEventListener("fit", () => {
                this.setScale()
            })
        })
    },

    computeBBox() {
        const tempRotation = this.el.object3D.rotation.clone()
        const elMesh = this.el.getObject3D("mesh")
        
        this.el.object3D.rotation.set(0, 0, 0) // reset rotation to compute correct original bbox
        this.bbox = new AFRAME.THREE.Box3().setFromObject(elMesh)
        this.el.object3D.rotation.copy(tempRotation)
    },

    calculateNewScale() {
        const elementPos = this.el.object3D.position
        const cameraPos = this.camera.getWorldPosition(new AFRAME.THREE.Vector3())
        const cameraFovInRad = AFRAME.THREE.MathUtils.degToRad(this.camera.fov)

        const distanceToCenter = Math.abs(cameraPos.distanceTo(elementPos))
        const vFOV = 2 * Math.tan(cameraFovInRad / 2)
        const bboxSize = this.bbox.getSize(new AFRAME.THREE.Vector3())

        // Multiply margin by two to make it CSS-like
        // For example: margin is 20, so 20 and 20 for both sides, 40 in total
        const margin = (this.data.margin * 2) / 100

        let difference = 100
        let oldScale = 1
        let newScale = 1
        let count = 0

        while (difference > 0.05 && count < 100) {
            const distanceToFrontFace = distanceToCenter - newScale * bboxSize.z / 2 // modify the distance, so we use the front face of the object, not its center
            const distance = this.data.useFrontFace ? distanceToFrontFace : distanceToCenter
            const visibleHeight = vFOV * distance
            const visibleWidth = visibleHeight * this.camera.aspect

            const scaleByVisibleHeight = (visibleHeight - visibleHeight * margin) / bboxSize.y
            const scaleByVisibleWidth = (visibleWidth - visibleWidth * margin) / bboxSize.x

            newScale = Math.min(scaleByVisibleWidth, scaleByVisibleHeight)
            difference = Math.abs(newScale - oldScale)
            
            oldScale = newScale
            count++
        }

        if (count >= 100) {
            console.warn("Warning fit-into-fov: calculation of new scale took too long, fit-into-fov might not work properly")
        }

        return new AFRAME.THREE.Vector3(newScale, newScale, newScale)
    },

    setScale() {
        const newScale = this.calculateNewScale()
        this.el.object3D.scale.copy(newScale)
    }
})