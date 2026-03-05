import * as AFRAME from "aframe"
import "aframe-troika-text";
import { PRIMARY_COLOR_DARK, VARIANT_LIGHT_COLOR } from "../utils/colors.js"
import "../primitives/ar-button.js" 
import "../primitives/ar-avatar.js"
import arrowBackIcon from "../assets/arrow-back.png"
import arrowForwardIcon from "../assets/arrow-forward.png"

AFRAME.registerComponent("carousel", {
    schema: {
        width: { type: "number", default: 1 },
        height: { type: "number", default: 1 },
        opacity: { type: "number", default: 1},
        images: { 
            type: "array", 
            default: [],
            parse: function (value) {
                // 1. If it's already an array, return it
                if (Array.isArray(value)) return value;
                
                // 2. If it's a JSON-style string (starts with [), parse it
                if (typeof value === 'string' && value.trim().startsWith('[')) {
                    try {
                        return JSON.parse(value.replace(/'/g, '"'));
                    } catch (e) {
                        console.error("Carousel: JSON parse failed, falling back to split", e);
                    }
                }

                // 3. Otherwise, use A-Frame's default: split by comma (Works for "#id1, #id2" or simple paths)
                return typeof value === 'string' ? value.split(',').map(s => s.trim()) : value;
            }
        },      
        arrows: { type: "boolean", default: true },
        custombuttons: { type: "boolean", default: false },
        previous: { 
            default: { label: "Previous", color: PRIMARY_COLOR_DARK },
            parse: function (value) {
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value.replace(/'/g, '"'));
                    } catch (e) {
                        return { label: "Previous", color: PRIMARY_COLOR_DARK };
                    }
                }
                return value;
            }
        },
        next: { 
            default: { label: "Next", color: PRIMARY_COLOR_DARK },
            parse: function (value) {
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value.replace(/'/g, '"'));
                    } catch (e) {
                        return { label: "Next", color: PRIMARY_COLOR_DARK };
                    }
                }
                return value;
            }
        },
    },

    init() {
        // Initialize state variables
        this.buttons = [];
        this.currentIndex = 0;

        this.setImages();
        this.setButtons();
    },

    update(oldData) {
        // Skip the first update loop as init() handles initial setup
        if (Object.keys(oldData).length === 0) return;
    
        // Checking which properties have changed and executing the appropriate functions
        const changedProperties = Object.keys(this.data).filter(property => this.data[property] !== oldData[property]);
        changedProperties.forEach(property => {
            switch (property) {
                case 'width':
                case 'height':
                    this.setImages();
                    this.setButtons();
                    break;
                case 'opacity':
                    this.updateCarouselOpacity();
                    break;
                case 'images':
                    this.currentIndex = 0;
                    this.setImages();
                    break;
                case 'arrows':
                case 'custombuttons':
                case 'previous':
                case 'next':
                    this.setButtons();
                    break;
                default:
                    break;
            }
        });
    },

    updateCarouselOpacity() {
        if (this.imageEl) this.imageEl.setAttribute("opacity", this.data.opacity);
        this.buttons.forEach(btn => btn.setAttribute("opacity", this.data.opacity));
    },

    setImages() {
        if (!this.imageEl) {
            this.imageEl = document.createElement("a-image");
            this.imageEl.setAttribute("position", "0 0 0.01");
            this.el.appendChild(this.imageEl);
        }

        this.imageEl.setAttribute("width", this.data.width);
        this.imageEl.setAttribute("height", this.data.height);

        const images = this.data.images;
        if (images && images.length > 0) {
            // Wrap index
            if (this.currentIndex < 0) this.currentIndex = images.length - 1;
            if (this.currentIndex >= images.length) this.currentIndex = 0;
            
            this.imageEl.setAttribute("src", images[this.currentIndex]);
            this.imageEl.setAttribute("visible", true);
        } else {
            this.imageEl.setAttribute("visible", false);
        }
    },

    setButtons() {
        // Remove old buttons
        this.buttons.forEach(btn => btn.remove());
        this.buttons = [];

        if (this.data.custombuttons) {
            this.createCustomButtons();
        } else if (this.data.arrows) {
            this.createArrows();
        }
    },

    createArrows() {
        const padding = 0.05;
        const arrowAvatarRadius = 0.08; // from avatar component size 'small'
        const xOffset = this.data.width / 2 - arrowAvatarRadius - padding;

        // Left Arrow
        const leftArrow = document.createElement("a-ar-avatar");
        leftArrow.setAttribute("image", arrowBackIcon);
        leftArrow.setAttribute("position", `${-xOffset} 0 0.05`);
        leftArrow.setAttribute("size", "small");
        leftArrow.setAttribute("class", "clickable");
        leftArrow.setAttribute("color", VARIANT_LIGHT_COLOR);
        leftArrow.addEventListener("click", () => this.onButtonClick(-1));
        this.el.appendChild(leftArrow);
        this.buttons.push(leftArrow);

        // Right Arrow
        const rightArrow = document.createElement("a-ar-avatar");
        rightArrow.setAttribute("image", arrowForwardIcon);
        rightArrow.setAttribute("position", `${xOffset} 0 0.05`);
        rightArrow.setAttribute("size", "small");
        rightArrow.setAttribute("class", "clickable");
        rightArrow.setAttribute("color", VARIANT_LIGHT_COLOR);
        rightArrow.addEventListener("click", () => this.onButtonClick(1));
        this.el.appendChild(rightArrow);
        this.buttons.push(rightArrow);
    },

    createCustomButtons() {
        const padding = 0.05;

        // Previous
        const previousData = this.data.previous;
        const previousLabel = previousData.label || "Previous";
        const previousWidth = this._calculateButtonWidth(previousLabel);
        const previousButton = document.createElement("a-ar-button");
        previousButton.setAttribute("content", previousLabel);
        previousButton.setAttribute("color", previousData.color || PRIMARY_COLOR_DARK);
        previousButton.setAttribute("size", "small");
        previousButton.setAttribute("elevated", false);
        const previousButtonX = -(this.data.width / 2) + padding + previousWidth / 2;
        previousButton.setAttribute("position", `${previousButtonX} 0 0.05`);
        previousButton.addEventListener("click", () => this.onButtonClick(-1));
        this.el.appendChild(previousButton);
        this.buttons.push(previousButton);

        // Next
        const nextData = this.data.next;
        const nextLabel = nextData.label || "Next";
        const nextWidth = this._calculateButtonWidth(nextLabel);
        const nextButton = document.createElement("a-ar-button");
        nextButton.setAttribute("content", nextLabel);
        nextButton.setAttribute("color", nextData.color || PRIMARY_COLOR_DARK);
        nextButton.setAttribute("size", "small");
        nextButton.setAttribute("elevated", false);
        const nextButtonX = this.data.width / 2 - padding - nextWidth / 2;
        nextButton.setAttribute("position", `${nextButtonX} 0 0.05`);
        nextButton.addEventListener("click", () => this.onButtonClick(1));
        this.el.appendChild(nextButton);
        this.buttons.push(nextButton);
    },

    onButtonClick(direction) {
        this.currentIndex += direction;
        this.setImages();
        this.el.emit('change', { index: this.currentIndex, src: this.data.images[this.currentIndex] });
    },

    _calculateButtonWidth(text) {
        const sizeCoef = 0.06; // small
        const letterWidthRatio = 0.55;
        const textStr = text || "";
        // Logic from button.js: Ensure the text does not exceed 15 characters
        const displayText = textStr.length > 15 ? textStr.substring(0, 12) + "..." : textStr;
        
        const textWidth = displayText.length * letterWidthRatio * sizeCoef;
        const outerPadding = 0.1;

        // From button.js setContent()
        return outerPadding + textWidth + outerPadding;
    },
})
