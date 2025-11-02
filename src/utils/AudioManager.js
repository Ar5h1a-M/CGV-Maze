// src/utils/AudioManager.js
import * as THREE from 'three';

export class AudioManager {
  constructor(camera) {
    this.camera = camera;
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    this.audioLoader = new THREE.AudioLoader();
    this.ambience = new THREE.Audio(this.listener);
    this.noteBlip = null; // optional HTML audio for UI feedback

    this.audioLoader.setMimeType('audio/mpeg');
  }

  loadAndPlayAmbience(path = '/audio/ambience_spooky.mp3', volume = 0.35) {
    this.audioLoader.load(path, (buffer) => {
      this.ambience.setBuffer(buffer);
      this.ambience.setLoop(true);
      this.ambience.setVolume(volume);
      this.ambience.play();
    }, undefined, (err) => console.warn('Ambience load error:', err));
  }

  attachNoteBlip(htmlAudioElement) {
    this.noteBlip = htmlAudioElement;
  }

  playNoteBlip() {
    if (!this.noteBlip) return;
    try { this.noteBlip.currentTime = 0; this.noteBlip.play(); } catch {}
  }
}
