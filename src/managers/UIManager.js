export class UIManager {
    constructor() {
        this.currentUI = null;
    }

    clearUI() {
        // Remove any existing UI elements
        const existingUI = document.querySelectorAll('[data-ui-element]');
        existingUI.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }

    createMenu() {
        this.clearUI();
        // Menu creation will be handled by MenuScene
    }

    createHUD() {
        this.clearUI();
        // HUD creation will be handled by HUD class
    }
}