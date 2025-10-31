export class UIManager {
    constructor() {
        this.currentUI = null;
    }

    clearUI() {
    // Remove any existing UI elements with more specific selectors
    const existingUI = document.querySelectorAll('[data-ui-element], [data-menu-element]');
    existingUI.forEach(element => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    
    // Also remove any dynamically added styles
    const dynamicStyles = document.querySelectorAll('style[data-menu-element]');
    dynamicStyles.forEach(style => {
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    });
    
    console.log('UI cleared completely');
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