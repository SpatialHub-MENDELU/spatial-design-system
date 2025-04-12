import * as AFRAME from "aframe";

AFRAME.registerComponent("auto-vr", {
  schema: {
    autoEnter: { type: "boolean", default: true },
    createButton: { type: "boolean", default: true },
    buttonText: { type: "string", default: "Enter VR" },
    pollInterval: { type: "number", default: 2000 },
    maxAttempts: { type: "number", default: 10 }
  },

  init() {
    this.vrButton = null;
    this.isVrSupported = false;
    this.hasEntered = false;
    this.isSceneLoaded = false;
    this.pollIntervalId = null;
    this.attemptCount = 0;

    this.checkVRSupport = this.checkVRSupport.bind(this);
    this.enterVR = this.enterVR.bind(this);
    this.exitVR = this.exitVR.bind(this);
    this.onVRDisplayConnect = this.onVRDisplayConnect.bind(this);
    this.onVRDisplayDisconnect = this.onVRDisplayDisconnect.bind(this);
    this.onEnterVR = this.onEnterVR.bind(this);
    this.onExitVR = this.onExitVR.bind(this);
    this.onSceneLoaded = this.onSceneLoaded.bind(this);
    this.pollForVR = this.pollForVR.bind(this);

    window.addEventListener('vrdisplayconnect', this.onVRDisplayConnect);
    window.addEventListener('vrdisplaydisconnect', this.onVRDisplayDisconnect);
    
    this.el.addEventListener('enter-vr', this.onEnterVR);
    this.el.addEventListener('exit-vr', this.onExitVR);
    
    if (this.el.hasLoaded) {
      this.isSceneLoaded = true;
      this.onSceneLoaded();
    } else {
      this.el.addEventListener('loaded', this.onSceneLoaded);
    }
    
    if (this.data.createButton) {
      this.createVRButton();
    }
    
    this.checkVRSupport();
  },

  onSceneLoaded() {
    this.isSceneLoaded = true;
    
    if (this.data.autoEnter && !this.hasEntered) {
      this.startPolling();
    }
  },

  startPolling() {
    this.stopPolling();
    
    this.attemptCount = 0;
    this.pollIntervalId = setInterval(this.pollForVR, this.data.pollInterval);
  },

  stopPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  },

  pollForVR() {
    this.attemptCount++;
    
    if (this.attemptCount > this.data.maxAttempts) {
      this.stopPolling();
      return;
    }
    
    if (this.hasEntered) {
      this.stopPolling();
      return;
    }
    
    if (this.isSceneLoaded && this.isVrSupported) {
      this.enterVR();
    } else {
      if (!this.isVrSupported) {
        this.checkVRSupport();
      }
    }
  },

  checkVRSupport() {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr')
        .then(supported => {
          this.isVrSupported = supported;
        })
        .catch(error => {});
    } else if (navigator.getVRDisplays) {
      navigator.getVRDisplays()
        .then(displays => {
          this.isVrSupported = displays && displays.length > 0;
        })
        .catch(error => {});
    } else {
      this.isVrSupported = false;
    }
  },

  enterVR() {
    if (this.hasEntered) {
      return;
    }
    
    try {
      this.el.enterVR();
    } catch (error) {
      if (this.vrButton) {
        this.vrButton.textContent = this.data.buttonText;
      }
    }
  },

  exitVR() {
    if (!this.hasEntered) return;
    
    try {
      this.el.exitVR();
    } catch (error) {}
  },

  onVRDisplayConnect() {
    this.isVrSupported = true;
    
    if (this.data.autoEnter && !this.hasEntered && this.isSceneLoaded) {
      this.startPolling();
    }
  },

  onVRDisplayDisconnect() {
    this.isVrSupported = false;
    this.stopPolling();
    
    if (this.hasEntered) {
      this.exitVR();
    }
  },

  onEnterVR() {
    this.hasEntered = true;
    this.stopPolling();
    
    if (this.vrButton) {
      this.vrButton.textContent = "Exit VR";
    }
  },

  onExitVR() {
    this.hasEntered = false;
    
    if (this.vrButton) {
      this.vrButton.textContent = this.data.buttonText;
    }
  },

  createVRButton() {
    if (this.vrButton && this.vrButton.parentNode) {
      this.vrButton.parentNode.removeChild(this.vrButton);
      this.vrButton = null;
    }
    
    const existingButton = document.getElementById('auto-vr-button');
    if (existingButton && existingButton.parentNode) {
      existingButton.parentNode.removeChild(existingButton);
    }
    
    this.vrButton = document.createElement('button');
    this.vrButton.textContent = this.hasEntered ? "Exit VR" : this.data.buttonText;
    this.vrButton.id = 'auto-vr-button';
    
    Object.assign(this.vrButton.style, {
      position: 'fixed',
      padding: '10px 20px',
      zIndex: '9999',
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      cursor: 'pointer',
      border: 'none',
      borderRadius: '4px',
      color: '#ffffff',
      backgroundColor: '#000000',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)'
    });
    
    this.vrButton.addEventListener('click', () => {
      if (this.hasEntered) {
        this.exitVR();
      } else {
        this.enterVR();
      }
    });
    
    document.body.appendChild(this.vrButton);
  },

  update(oldData) {
    if (oldData && this.data.createButton !== oldData.createButton) {
      if (this.data.createButton) {
        this.createVRButton();
      } else if (this.vrButton && this.vrButton.parentNode) {
        this.vrButton.parentNode.removeChild(this.vrButton);
        this.vrButton = null;
      }
    }
    
    if (oldData && oldData.autoEnter !== this.data.autoEnter) {
      if (this.data.autoEnter && this.isSceneLoaded && !this.hasEntered) {
        this.startPolling();
      } else if (!this.data.autoEnter) {
        this.stopPolling();
      }
    }
    
    if (oldData && 
        (oldData.pollInterval !== this.data.pollInterval || 
         oldData.maxAttempts !== this.data.maxAttempts) && 
        this.pollIntervalId) {
      this.startPolling();
    }
  },

  remove() {
    this.stopPolling();
    
    window.removeEventListener('vrdisplayconnect', this.onVRDisplayConnect);
    window.removeEventListener('vrdisplaydisconnect', this.onVRDisplayDisconnect);
    this.el.removeEventListener('enter-vr', this.onEnterVR);
    this.el.removeEventListener('exit-vr', this.onExitVR);
    this.el.removeEventListener('loaded', this.onSceneLoaded);
    
    if (this.vrButton && this.vrButton.parentNode) {
      this.vrButton.parentNode.removeChild(this.vrButton);
      this.vrButton = null;
    }
  }
});