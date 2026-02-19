import * as AFRAME from "aframe"
import { PRIMARY_COLOR_DARK, VARIANT_DARK_COLOR, VARIANT_LIGHT_COLOR, SUCCESS_COLOR, WARNING_COLOR, ERROR_COLOR, INFO_COLOR } from "../utils/colors.js"
import "../primitives/ar-card.js"

AFRAME.registerComponent("alert", {
    schema: {
        opacity: { type: "number", default: 1},
        mode: { type: "string", default: ""},
        color: { type: "string", default: PRIMARY_COLOR_DARK},
        textcolor: { type: "string", default: "black"},
        state: { type: "string", default: "" },
        title: { type: "string", default: "" },
        content: { type: "string", default: "" },
        prependicon: { type: "string", default: ""},
        closable: { type: "boolean", default: false },
        outlined: { type: "boolean", default: false },
    },

    init() {
        this.finalColor = this.data.color;
        this.card = null;

        this.setCard();
        this.updateCardColor();
    },

    update(oldData) {
        // Skip the first update loop as init() handles initial setup
        if (!oldData.color) return;

        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'opacity':
                    this.updateCardOpacity();
                    break;
                case 'color':
                case 'mode':
                    this.updateCardColor();
                    break;
                case 'state':
                    this.updateCardColor();
                    break;
                case 'textcolor':
                    this.updateTextColor(); 
                    break;
                case 'prependicon':
                case 'closable':
                case 'title':
                case 'content':
                case 'outlined':
                    this.setCard();
                    break;
                default:
                    break;
            }
        });
    },

    updateCardOpacity() {
        if (this.card) {
            this.card.setAttribute("opacity", this.data.opacity);
        }
    },

    updateCardColor() {
        if (!this.card) return;

        // Determine final color based on props
        if (this.data.state !== "") {
            this.setState();
            this.card.setAttribute("textcolor", "white");
        } else {
            this.card.setAttribute("prependicon", this.data.prependicon);

            if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
                this.finalColor = this.data.color;
            } else if (this.data.mode !== "") {
                this.setMode();
            } else {
                this.finalColor = PRIMARY_COLOR_DARK;
            }
        }
        
        this.card.setAttribute("color", this.finalColor);
    },

    updateTextColor() {
        if (this.card) {
            this.card.setAttribute("textcolor", this.data.textcolor);
        }
    },

    setCard() {
        if (!this.card) {
            this.card = document.createElement("a-ar-card");
            this.el.appendChild(this.card);

            this.card.addEventListener('appendIconClicked', () => {
                if (this.data.closable) {
                    this.el.parentNode.removeChild(this.el);
                }
            });
        }

        const cardEl = this.card;
        const cardData = this.data;

        cardEl.setAttribute("position", "0 0 0");
        cardEl.setAttribute("title", cardData.title);
        cardEl.setAttribute("subtitle", "")
        cardEl.setAttribute("content", cardData.content);
        cardEl.setAttribute("prependicon", cardData.prependicon);
        cardEl.setAttribute("outlined", cardData.outlined);
        cardEl.setAttribute("buttons", "[]");
        
        if (cardData.closable) {
            cardEl.setAttribute("appendicon", "/close.png");
        }

        if (this.data.state !== "") {
            this.setState();
        }
    },

    
    setMode() {
        // Mode is ignored if a specific color is set (and it's not the default)
        if (this.data.color !== PRIMARY_COLOR_DARK && this.data.color !== "") {
            return;
        }
        switch (this.data.mode) {
            case "light":
                this.finalColor = VARIANT_LIGHT_COLOR;
                break;
            case "dark":
                this.finalColor = VARIANT_DARK_COLOR;
                break;
            default:
                break;
        }
    },

    setState() {
        switch (this.data.state) {
            case "success":
                this.finalColor = SUCCESS_COLOR;
                this.card.setAttribute("prependicon", "/success.png");
                break;
            case "warning":
                this.finalColor = WARNING_COLOR;
                this.card.setAttribute("prependicon", "/warning.png");
                break;
            case "error":
                this.finalColor = ERROR_COLOR;
                this.card.setAttribute("prependicon", "/error.png");
                break;
            case "info":
                this.finalColor = INFO_COLOR;
                this.card.setAttribute("prependicon", "/info.png");
                break;
            default:
                break;
        }
    },

})
