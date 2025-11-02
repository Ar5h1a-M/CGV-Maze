import * as THREE from 'three';
import { GameSettings } from '../utils/GameSettings.js';

export class OptionsScene {
    constructor() {
        this.scene = null;
        this.gameManager = null;
        this.uiManager = null;

        // ▼ added
        this.optionsContainer = null;
        this._styleElId = 'maze-options-style';
        this._clickGuard = false;
        this.refs = {};
    }

    init(gameManager, uiManager) {
        this.gameManager = gameManager;
        this.uiManager = uiManager;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        
        // ▼ added
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
        this.scene.add(new THREE.AmbientLight(0x222222));
        this._injectStyleOnce();

        this.createOptionsUI();

        // apply any saved settings on entry
        this._syncFromStorage();
    }

    createOptionsUI() {
        // Remove any existing UI
        this.uiManager.clearUI();

        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #8b0000;
            font-family: 'Courier New', monospace;
            width: min(720px, 92vw);
            background: rgba(10,10,10,0.85);
            border: 1px solid #2b0a0a;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            padding: 28px;
        `;

        const title = document.createElement('h1');
        title.textContent = 'OPTIONS';
        title.style.cssText = `
            font-size: 3em;
            margin-bottom: 0.8em;
            text-shadow: 0 0 10px #ff0000;
            letter-spacing: 2px;
        `;

        // ▼▼▼ added: controls grid
        const grid = document.createElement('div');
        grid.style.cssText = `
            display:grid;
            grid-template-columns: 1fr 180px;
            gap:16px 18px;
            align-items:center;
            margin: 0 auto 16px auto;
            text-align: left;
            max-width: 640px;
        `;

        const addToggle = (label, key, defVal=true) => {
            const l = document.createElement('div');
            l.textContent = label;
            l.style.opacity = '0.9';

            const r = document.createElement('div');
            r.style.cssText = `display:flex; justify-content:flex-end; align-items:center; gap:10px;`;

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = this._getS(key, defVal);
            cb.addEventListener('change', () => {
                this._setS(key, cb.checked);
                this._applyImmediate(key, cb.checked);
            });

            r.appendChild(cb);
            grid.appendChild(l);
            grid.appendChild(r);
            this.refs[key] = cb;
        };

        const addSlider = (label, key, opts) => {
            const { min, max, step, def, format } = opts;
            const l = document.createElement('div');
            l.textContent = label;
            l.style.opacity = '0.9';

            const r = document.createElement('div');
            r.style.cssText = `display:flex; justify-content:flex-end; align-items:center; gap:10px;`;

            const range = document.createElement('input');
            range.type = 'range';
            range.min = String(min);
            range.max = String(max);
            range.step = String(step);
            const current = this._getS(key, def);
            range.value = String(current);

            const val = document.createElement('span');
            val.textContent = format(current);

            range.addEventListener('input', () => {
                val.textContent = format(Number(range.value));
            });

            range.addEventListener('change', () => {
                const v = Number(range.value);
                this._setS(key, v);
                if (key === 'gs_resScale') this._applyResolutionScale(v);
                if (key === 'gs_aniso')    this._applyAnisotropy(v);
            });

            r.appendChild(range);
            r.appendChild(val);
            grid.appendChild(l);
            grid.appendChild(r);

            this.refs[key] = range;
        };

        // Toggles
        addToggle('Bump/Normal Maps', 'gs_bump', true);
        addToggle('Enemy Textures',   'gs_enemytex', true);
        addToggle('Skybox',           'gs_skybox', true);
        addToggle('Shadows',          'gs_shadows', true);
        addToggle('Fog of War',       'gs_fog', true);
        addToggle('Post-Processing',  'gs_postfx', true);

        // Sliders
        addSlider('Resolution Scale', 'gs_resScale', {
            min: 0.5, max: 1.5, step: 0.05, def: 1, format: v => `×${Number(v).toFixed(2)}`
        });

        // detect renderer caps once
        const caps = this._getRenderer()?.capabilities;
        const maxAniso = caps ? caps.getMaxAnisotropy() : 16;
        addSlider('Max Anisotropy', 'gs_aniso', {
            min: 1, max: Math.max(4, maxAniso), step: 1, def: Math.min(4, maxAniso),
            format: v => `${Math.round(v)}`
        });
        // ▲▲▲ controls

        const btnRow = document.createElement('div');
        btnRow.style.cssText = `
            display:flex; justify-content:space-between; gap:12px; margin-top:22px;
        `;

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'RESET';
        resetBtn.style.cssText = this._btnStyle();
        resetBtn.onclick = () => this._resetDefaults();

        const backBtn = document.createElement('button');
        backBtn.textContent = 'BACK TO MENU';
        backBtn.style.cssText = this._btnStyle(true);
        backBtn.onmouseover = () => backBtn.style.background = '#3a1a1a';
        backBtn.onmouseout  = () => backBtn.style.background = '#2a0a0a';
        backBtn.onclick = () => {
            // click-guard to prevent multiple rapid navigations (fixes "bug")
            if (this._clickGuard) return;
            this._clickGuard = true;
            this.cleanup();
            this.gameManager.sceneManager.switchToScene('menu');
            setTimeout(() => (this._clickGuard = false), 500);
        };

        btnRow.appendChild(resetBtn);
        btnRow.appendChild(backBtn);

        optionsContainer.appendChild(title);
        optionsContainer.appendChild(grid);       // ← added
        optionsContainer.appendChild(btnRow);     // ← added
        optionsContainer.appendChild(document.createElement('div')); // spacer for aesthetics

        document.body.appendChild(optionsContainer);
        this.optionsContainer = optionsContainer;
    }

    update() {
        // Options scene doesn't need animation
    }

    cleanup() {
        if (this.optionsContainer) {
            document.body.removeChild(this.optionsContainer);
        }
        this.optionsContainer = null;
    }

    /* ==================== Added helpers ==================== */

    _btnStyle(small=false) {
        return `
            ${small ? '' : 'flex:1;'}
            display: block;
            width: ${small ? '200px' : 'auto'};
            padding: 15px;
            margin: 0;
            background: #2a0a0a;
            color: #8b0000;
            border: 2px solid #8b0000;
            font-size: 1.1em;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            transition: all 0.3s;
            border-radius: 10px;
        `;
    }

    _injectStyleOnce() {
        if (document.getElementById(this._styleElId)) return;
        const style = document.createElement('style');
        style.id = this._styleElId;
        style.textContent = `
            input[type="checkbox"] { width:18px; height:18px; accent-color:#8b0000; }
            input[type="range"] { width:160px; }
        `;
        document.head.appendChild(style);
    }

    _getRenderer() {
        // Try common locations without changing your architecture
        return this.gameManager?.renderer ||
               this.uiManager?.renderer ||
               window.SceneManagerRef?.renderer || null;
    }

    _getCurrentSceneThree() {
        return this.gameManager?.sceneManager?.currentScene?.scene ||
               window.SceneManagerRef?.currentScene?.scene || null;
    }

    _getS(key, def) {
        const v = localStorage.getItem(key);
        if (v === null) return def;
        if (v === 'true' || v === 'false') return v === 'true';
        const n = Number(v);
        return Number.isNaN(n) ? v : n;
    }

    _setS(key, value) {
        localStorage.setItem(key, String(value));
    }

    _syncFromStorage() {
        // apply what we can immediately
        this._applyResolutionScale(this._getS('gs_resScale', 1));
        this._applyAnisotropy(this._getS('gs_aniso', 4));
        this._applyImmediate('gs_shadows', this._getS('gs_shadows', true));
    }

    _applyResolutionScale(scale) {
        const r = this._getRenderer();
        if (!r) return;
        r.setPixelRatio(Math.max(0.5, Math.min(2, Number(scale))));
        r.setSize(window.innerWidth, window.innerHeight, false);
    }

    _applyAnisotropy(level) {
        const renderer = this._getRenderer();
        const max = renderer?.capabilities?.getMaxAnisotropy?.() || 16;
        const aniso = Math.max(1, Math.min(max, Number(level)));

        const scene = this._getCurrentSceneThree();
        if (scene?.traverse) {
            scene.traverse(obj => {
                const m = obj.material;
                const setA = (tex) => { if (tex) tex.anisotropy = aniso; };
                if (m) {
                    const mats = Array.isArray(m) ? m : [m];
                    mats.forEach(mm => {
                        setA(mm.map); setA(mm.normalMap); setA(mm.bumpMap);
                        setA(mm.roughnessMap); setA(mm.metalnessMap); setA(mm.emissiveMap);
                    });
                }
            });
        }
        this._setS('gs_aniso', aniso);
    }

    _applyImmediate(key, value) {
        const renderer = this._getRenderer();
        switch (key) {
            case 'gs_shadows':
                if (renderer) renderer.shadowMap.enabled = !!value;
                break;
            // Others are read by your game scene at build time; we persist only.
            default: break;
        }
    }

    _resetDefaults() {
        const defaults = {
            gs_bump: true, gs_enemytex: true, gs_skybox: true,
            gs_shadows: true, gs_fog: true, gs_postfx: true,
            gs_resScale: 1, gs_aniso: 4
        };
        Object.entries(defaults).forEach(([k, v]) => this._setS(k, v));

        // reflect in UI if mounted
        if (this.refs) {
            if (this.refs.gs_resScale) this.refs.gs_resScale.value = String(defaults.gs_resScale);
            if (this.refs.gs_aniso)    this.refs.gs_aniso.value    = String(defaults.gs_aniso);
            ['gs_bump','gs_enemytex','gs_skybox','gs_shadows','gs_fog','gs_postfx'].forEach(k => {
                if (this.refs[k] && 'checked' in this.refs[k]) this.refs[k].checked = defaults[k];
            });
        }

        // re-apply immediate ones
        this._applyResolutionScale(defaults.gs_resScale);
        this._applyAnisotropy(defaults.gs_aniso);
        this._applyImmediate('gs_shadows', defaults.gs_shadows);
    }
}
