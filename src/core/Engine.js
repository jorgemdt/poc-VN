import * as THREE from 'three';

/**
 * Engine.js
 * Núcleo de renderização WebGL com Three.js.
 *
 * Por que existe:
 * Encapsula a criação da Scene, OrthographicCamera (com resolução lógica fixa 16:9),
 * WebGLRenderer e o loop de animação (requestAnimationFrame). Dessa forma, o restante
 * do framework trabalha com coordenadas 2D previsíveis (-640..640 x -360..360),
 * mantendo aceleração total de hardware via GPU.
 */
export class Engine {
  /**
   * @param {HTMLElement} container Elemento DOM onde o <canvas> será inserido.
   * @param {object} [options]
   * @param {number} [options.logicalWidth=1280] Largura lógica da cena.
   * @param {number} [options.logicalHeight=720] Altura lógica da cena.
   */
  constructor(container, options = {}) {
    this.container = container;
    this.logicalWidth = options.logicalWidth ?? 1280;
    this.logicalHeight = options.logicalHeight ?? 720;

    this.scene = new THREE.Scene();

    const halfW = this.logicalWidth / 2;
    const halfH = this.logicalHeight / 2;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 1000);
    this.camera.position.z = 500;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    /** @type {Set<Function>} */
    this.updateCallbacks = new Set();
    this.clock = new THREE.Clock();
    this.rafId = null;

    this._onResize = this._handleResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._handleResize();
  }

  /**
   * Mantém a proporção lógica (16:9) centralizada dentro da janela sem distorcer os planos.
   */
  _handleResize() {
    const parentW = this.container.clientWidth || window.innerWidth;
    const parentH = this.container.clientHeight || window.innerHeight;
    const targetAspect = this.logicalWidth / this.logicalHeight;
    const windowAspect = parentW / parentH;

    let renderW;
    let renderH;

    if (windowAspect > targetAspect) {
      renderH = parentH;
      renderW = Math.floor(parentH * targetAspect);
    } else {
      renderW = parentW;
      renderH = Math.floor(parentW / targetAspect);
    }

    this.renderer.setSize(renderW, renderH, true);
  }

  /**
   * Registra uma função chamada a cada frame com (deltaTime, elapsedTime).
   * @param {Function} callback
   * @returns {Function} Função para remover o callback.
   */
  onUpdate(callback) {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /**
   * Inicia o loop contínuo de renderização.
   */
  start() {
    if (this.rafId !== null) return;
    this.clock.start();

    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      const deltaTime = Math.min(this.clock.getDelta(), 0.1);
      const elapsedTime = this.clock.elapsedTime;

      for (const cb of this.updateCallbacks) {
        cb(deltaTime, elapsedTime);
      }

      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }

  /**
   * Interrompe o loop e libera ouvintes globais.
   */
  dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
