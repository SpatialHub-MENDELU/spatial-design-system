import * as AFRAME from "aframe";

/**
 * Session modes
 *
 * auto - Automatically choose the best mode
 * ar - Force AR mode if supported
 * vr - Force VR mode if supported
 * inline - Run in inline mode (no XR, webXR default)
 */

AFRAME.registerComponent("auto-xr", {
  schema: {
    autoEnter: { type: "boolean", default: true },
    createButton: { type: "boolean", default: true },
    buttonText: { type: "string", default: "Enter XR" },
    sessionMode: {
      type: "string",
      default: "auto",
      oneOf: ["auto", "ar", "vr", "inline"],
    },
    pollInterval: { type: "number", default: 2000 },
    maxAttempts: { type: "number", default: 10 },
  },

  init() {
    this.xrButton = null;
    this.targetMode = "inline";

    this.isVrSupported = false;
    this.isArSupported = false;

    this.isDesktop = false;

    this.hasEntered = false;
    this.isSceneLoaded = false;
    this.pollIntervalId = null;
    this.attemptCount = 0;

    this.chooseSessionMode = this.chooseSessionMode.bind(this);

    this.checkVRSupport = this.checkVRSupport.bind(this);
    this.checkARSupport = this.checkARSupport.bind(this);

    this.detectDeviceType = this.detectDeviceType.bind(this);

    this.enterXR = this.enterXR.bind(this);
    this.exitXR = this.exitXR.bind(this);

    this.onXRDisplayConnect = this.onXRDisplayConnect.bind(this);
    this.onXRDisplayDisconnect = this.onXRDisplayDisconnect.bind(this);

    this.onEnterXR = this.onEnterXR.bind(this);
    this.onExitXR = this.onExitXR.bind(this);

    this.onSceneLoaded = this.onSceneLoaded.bind(this);
    this.pollForXR = this.pollForXR.bind(this);

    this.detectDeviceType();

    window.addEventListener("vrdisplayconnect", this.onXRDisplayConnect);
    window.addEventListener("vrdisplaydisconnect", this.onXRDisplayDisconnect);

    this.el.addEventListener("enter-vr", this.onEnterXR);
    this.el.addEventListener("exit-vr", this.onExitXR);

    if (this.el.hasLoaded) {
      this.isSceneLoaded = true;
      this.onSceneLoaded();
    } else {
      this.el.addEventListener("loaded", this.onSceneLoaded);
    }

    if (this.data.createButton) {
      this.createXRButton();
    }

    Promise.all([this.checkVRSupport(), this.checkARSupport()]).then(() => {
      this.targetMode = this.chooseSessionMode();
      setTimeout(() => {
        this.checkSessionSupport();
      }, 1000);
      this.maybeStartPolling();
    });
  },

  onSceneLoaded() {
    this.isSceneLoaded = true;
    this.maybeStartPolling();
  },

  maybeStartPolling() {
    if (
      this.data.autoEnter &&
      this.isSceneLoaded &&
      !this.hasEntered &&
      this.targetMode !== "inline"
    ) {
      this.startPolling();
    }
  },

  startPolling() {
    this.stopPolling();

    this.attemptCount = 0;
    this.pollIntervalId = setInterval(this.pollForXR, this.data.pollInterval);
  },

  stopPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  },

  pollForXR() {
    this.attemptCount++;

    if (this.attemptCount > this.data.maxAttempts) {
      this.stopPolling();
      return;
    }

    if (this.hasEntered) {
      this.stopPolling();
      return;
    }

    if (!this.isSceneLoaded) {
      return;
    }

    if (this.targetMode === "inline") {
      this.stopPolling();
    }

    if (this.isVrSupported || this.isArSupported) {
      this.enterXR();
    } else {
      if (!(this.isVrSupported || this.isArSupported)) {
        this.checkVRSupport();
        this.checkARSupport();
      }
    }
  },

  chooseSessionMode() {
    const forced = this.data.sessionMode;
    if (forced !== "auto") {
      if (forced === "vr" && this.isVrSupported) return "vr";
      else if (forced === "ar" && this.isArSupported) return "ar";
      return "inline";
    }

    if (navigator.xr) {
      if (this.isArSupported) return "ar";
      if (this.isVrSupported) return "vr";
    }
    return "inline";
  },

  async checkVRSupport() {
    if (navigator.xr) {
      try {
        this.isVrSupported = await navigator.xr.isSessionSupported(
          "immersive-vr"
        );
      } catch {
        this.isVrSupported = false;
      }
    } else if (navigator.getVRDisplays) {
      try {
        const displays = await navigator.getVRDisplays();
        this.isVrSupported = displays.length > 0;
      } catch {
        this.isVrSupported = false;
      }
    } else {
      this.isVrSupported = false;
    }
    return this.isVrSupported;
  },

  async checkARSupport() {
    if (navigator.xr) {
      try {
        this.isArSupported = await navigator.xr.isSessionSupported(
          "immersive-ar"
        );
      } catch {
        this.isArSupported = false;
      }
    } else if (navigator.getVRDisplays) {
      try {
        const displays = await navigator.getVRDisplays();
        this.isArSupported = displays.length > 0;
      } catch {
        this.isArSupported = false;
      }
    } else {
      this.isArSupported = false;
    }
    return this.isArSupported;
  },

  detectDeviceType() {
    try {
      this.isDesktop = !window.matchMedia("(pointer: coarse)").matches;
    } catch (e) {
      const ua = navigator.userAgent;
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        this.isDesktop = false;
      } else if (
        /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
          ua
        )
      ) {
        this.isDesktop = false;
      } else {
        this.isDesktop = true;
      }
    }
  },

  enterXR() {
    if (this.hasEntered) {
      return;
    }

    if (!this.targetMode) {
      return;
    }

    try {
      if (this.targetMode === "vr") {
        this.el.enterVR();
      } else if (this.targetMode === "ar") {
        this.el.enterAR();
      }
    } catch (error) {
      if (this.xrButton) {
        this.updateButtonLabel();
      }
    }
  },

  exitXR() {
    if (!this.hasEntered) return;

    try {
      this.el.exitVR();
    } catch (error) {}
  },

  onXRDisplayConnect() {
    this.isVrSupported = true;
    this.isArSupported = true;
    if (this.data.autoEnter && !this.hasEntered && this.isSceneLoaded) {
      this.startPolling();
    }
  },

  onXRDisplayDisconnect() {
    this.isVrSupported = false;
    this.isArSupported = false;
    this.stopPolling();

    if (this.hasEntered) {
      this.exitXR();
    }
  },

  onEnterXR() {
    this.hasEntered = true;
    this.stopPolling();
    this.updateButtonLabel();
    this.el.emit("xr-entered", {
      mode: this.targetMode,
      session: this.el.sceneEl.xrSession,
    });
  },

  onExitXR() {
    this.hasEntered = false;
    this.updateButtonLabel();
    this.el.emit("xr-exited", { mode: this.targetMode });

    if (this.xrButton) {
      this.xrButton.textContent = this.data.buttonText;
    }
  },

  createXRButton() {
    if (this.xrButton && this.xrButton.parentNode) {
      this.xrButton.parentNode.removeChild(this.xrButton);
      this.xrButton = null;
    }

    const existingButton = document.getElementById("auto-vr-button");

    if (existingButton && existingButton.parentNode) {
      existingButton.parentNode.removeChild(existingButton);
    }

    this.xrButton = document.createElement("button");
    this.xrButton.id = "auto-vr-button";

    this.updateButtonLabel();

    Object.assign(this.xrButton.style, {
      position: "fixed",
      padding: "10px 20px",
      zIndex: "9999",
      fontSize: "16px",
      fontFamily: "Arial, sans-serif",
      cursor: "pointer",
      border: "none",
      borderRadius: "4px",
      color: "#ffffff",
      backgroundColor: "#000000",
      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
    });

    this.xrButton.addEventListener("click", () => {
      if (this.hasEntered) {
        this.exitXR();
      } else {
        this.enterXR();
      }
    });

    document.body.appendChild(this.xrButton);
  },

  updateButtonLabel() {
    if (!this.xrButton) return;

    if (this.hasEntered) {
      if (this.targetMode === "vr" && this.isDesktop) {
        this.xrButton.textContent = "Press ESC to Exit";
      } else {
        this.xrButton.textContent =
          this.targetMode === "vr"
            ? "Exit VR"
            : this.targetMode === "ar"
            ? "Exit AR"
            : "Exit";
      }
    } else {
      this.xrButton.textContent = this.data.buttonText;
    }
  },

  update(oldData) {
    if (!oldData) return;

    if (oldData.sessionMode !== this.data.sessionMode) {
      const mode = this.chooseSessionMode();
      this.targetMode = mode;
      if (this.hasEntered) this.exitXR();
      this.checkSessionSupport();
      if (this.data.autoEnter) this.startPolling();
      this.updateButtonLabel();
    }

    if (this.data.createButton !== oldData.createButton) {
      if (this.data.createButton) {
        this.createXRButton();
      } else if (this.xrButton && this.xrButton.parentNode) {
        this.xrButton.parentNode.removeChild(this.xrButton);
        this.xrButton = null;
      }
    }

    if (oldData.autoEnter !== this.data.autoEnter) {
      if (this.data.autoEnter && this.isSceneLoaded && !this.hasEntered) {
        this.startPolling();
      } else if (!this.data.autoEnter) {
        this.stopPolling();
      }
    }

    if (
      (oldData.pollInterval !== this.data.pollInterval ||
        oldData.maxAttempts !== this.data.maxAttempts) &&
      this.pollIntervalId
    ) {
      this.startPolling();
    }
  },

  remove() {
    this.stopPolling();

    window.removeEventListener("vrdisplayconnect", this.onXRDisplayConnect);
    window.removeEventListener(
      "vrdisplaydisconnect",
      this.onXRDisplayDisconnect
    );
    this.el.removeEventListener("enter-vr", this.onEnterXR);
    this.el.removeEventListener("exit-vr", this.onExitXR);
    this.el.removeEventListener("loaded", this.onSceneLoaded);

    if (this.xrButton && this.xrButton.parentNode) {
      this.xrButton.parentNode.removeChild(this.xrButton);
      this.xrButton = null;
    }
  },

  checkSessionSupport() {
    const requestedMode = this.data.sessionMode;

    if (requestedMode === "auto") {
      return;
    }

    let isSupported = false;
    let message = "";

    if (requestedMode === "vr") {
      isSupported = this.isVrSupported;
      message =
        "VR is not supported on this device. The app will run in available mode.";
    } else if (requestedMode === "ar") {
      isSupported = this.isArSupported;
      message =
        "AR is not supported on this device. The app will run in available mode.";
    }

    // If support is still being detected (both false), wait a bit more
    if (!this.isVrSupported && !this.isArSupported && navigator.xr) {
      setTimeout(() => {
        this.checkSessionSupport();
      }, 2000);
      return;
    }

    // Only show message if we're confident support is not available
    // and we're not in auto mode (which would fall back to inline)
    if (!isSupported && message && this.targetMode === "inline") {
      this.showInfoMessage(message);
    }
  },

  showInfoMessage(message) {
    // Remove existing message if any
    const existingMessage = document.getElementById("xr-info-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageElement = document.createElement("div");
    messageElement.id = "xr-info-message";
    messageElement.textContent = message;

    Object.assign(messageElement.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#333",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: "6px",
      fontSize: "14px",
      fontFamily: "Arial, sans-serif",
      zIndex: "10000",
      maxWidth: "80%",
      textAlign: "center",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      opacity: "0",
      transition: "opacity 0.3s ease-in-out",
    });

    document.body.appendChild(messageElement);

    setTimeout(() => {
      messageElement.style.opacity = "1";
    }, 100);

    setTimeout(() => {
      messageElement.style.opacity = "0";
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.remove();
        }
      }, 300);
    }, 5000);
  },
});
