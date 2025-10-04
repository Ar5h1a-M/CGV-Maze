import * as THREE from 'three';

export default class Flashlight {
  constructor(camera, {
    intensity = 3.0,
    distance = 12.0,
    angle = Math.PI / 6,
    penumbra = 0.35,
    batteryMax = 100,
    drainPerSec = 8,
    rechargePerSec = 4
  } = {}) {
    this.camera = camera;

    this.light = new THREE.SpotLight(0xffffff, 0);
    this.light.distance = distance;
    this.light.angle = angle;
    this.light.penumbra = penumbra;
    this.light.castShadow = false;

    camera.add(this.light);
    this.light.position.set(0, 0, 0);
    this.light.target.position.set(0, 0, -1);
    camera.add(this.light.target);

    this.enabled = false; // becomes true after pickup
    this.on = false;
    this.intensityOn = intensity;

    this.batteryMax = batteryMax;
    this.battery = batteryMax;
    this.drainPerSec = drainPerSec;
    this.rechargePerSec = rechargePerSec;
  }

  toggle(forceOff = false) {
    if (!this.enabled) return false;
    if (forceOff) this.on = false; else this.on = !this.on;
    if (this.on && this.battery <= 0) this.on = false;
    this.light.intensity = this.on ? this.intensityOn : 0;
    return this.on;
  }

  update(dt) {
    if (!this.enabled) return;
    if (this.on) {
      this.battery = Math.max(0, this.battery - this.drainPerSec * dt);
      if (this.battery <= 0) this.toggle(true);
    } else {
      this.battery = Math.min(this.batteryMax, this.battery + this.rechargePerSec * dt);
    }
  }

  get percent() {
    return Math.round((this.battery / this.batteryMax) * 100);
  }
}
