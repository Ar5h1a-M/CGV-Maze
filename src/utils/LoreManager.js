// src/utils/LoreManager.js
export class LoreManager {
  constructor() {
    this.container = null;
    this.noteSound = null; // optional hook
    this._ensureDOM();
  }

  _ensureDOM() {
    if (this.container) return;

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'lore-overlay';
    this.container.style.position = 'fixed';
    this.container.style.inset = '0';
    this.container.style.display = 'none';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';
    this.container.style.zIndex = '9999';
    this.container.style.background = 'rgba(0,0,0,0.7)';
    this.container.style.color = '#e7e7e7';
    this.container.style.fontFamily = 'ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial';
    this.container.style.textAlign = 'center';
    this.container.style.padding = '24px';

    const inner = document.createElement('div');
    inner.id = 'lore-inner';
    inner.style.maxWidth = '800px';
    inner.style.margin = '0 24px';
    inner.style.lineHeight = '1.5';
    inner.style.fontSize = '18px';
    inner.style.textShadow = '0 1px 2px rgba(0,0,0,0.9)';
    inner.style.whiteSpace = 'pre-wrap';
    inner.style.userSelect = 'none';

    // Tap/click hint
    const hint = document.createElement('div');
    hint.id = 'lore-hint';
    hint.style.marginTop = '16px';
    hint.style.opacity = '0.7';
    hint.style.fontSize = '14px';
    hint.textContent = 'Press [E] or click to close';

    this.container.appendChild(inner);
    this.container.appendChild(hint);
    document.body.appendChild(this.container);

    const close = () => this.hide();
    this.container.addEventListener('click', close);
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'e' || e.key === 'Escape') close();
    });
  }

  showIntro() {
    const text =
`You wake in darkness. Cold floor. Distant whispers.
The walls shift when you look away.
You don’t remember how you got here—only that you’ve been here before.

Find the light.
Escape the maze.
Before it remembers you.`;

    this._show(text);
  }

  showNote(text) {
    if (this.noteSound) {
      try { this.noteSound.currentTime = 0; this.noteSound.play(); } catch {}
    }
    this._show(text);
  }

  hide() {
    if (!this.container) return;
    this.container.style.display = 'none';
  }

  attachNoteSound(htmlAudioElement) {
    this.noteSound = htmlAudioElement;
  }

  _show(text) {
    const inner = document.getElementById('lore-inner');
    if (!inner) return;
    inner.textContent = text;
    this.container.style.display = 'flex';
  }
}
