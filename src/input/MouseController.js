import * as THREE from 'three';

/**
 * MouseController.js
 * Controla interação de ponteiro/mouse sobre o <canvas> WebGL usando THREE.Raycaster.
 *
 * Por que existe:
 * Separa a detecção geométrica 2D/3D (hover e clique em objetos da cena) da lógica
 * do roteiro. Quando o jogador clica em um objeto interativo (ex.: Orbe de Cristal),
 * emite 'object:click'. Quando clica em qualquer outra área da cena, emite 'scene:click'
 * para avançar os diálogos naturalmente.
 */
export class MouseController {
  /**
   * @param {import('../core/Engine.js').Engine} engine
   * @param {import('../core/LayerStack.js').LayerStack} layerStack
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(engine, layerStack, eventBus) {
    this.engine = engine;
    this.layerStack = layerStack;
    this.eventBus = eventBus;

    this.domElement = engine.renderer.domElement;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hoveredLayerId = null;

    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerLeave = this._handlePointerLeave.bind(this);

    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.domElement.addEventListener('pointerleave', this._onPointerLeave);
  }

  /**
   * Converte coordenadas de tela para NDC (-1 a +1) relativas ao canvas.
   * @param {PointerEvent} event
   */
  _updatePointerNDC(event) {
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  }

  /**
   * Executa raycasting contra os meshes marcados como interativos.
   * @returns {string|null} ID do par de camadas atingido, ou null.
   */
  _pickInteractiveLayer() {
    const interactiveMeshes = this.layerStack.getInteractiveMeshes();
    if (interactiveMeshes.length === 0) return null;

    this.raycaster.setFromCamera(this.pointer, this.engine.camera);
    const hits = this.raycaster.intersectObjects(interactiveMeshes, false);

    if (hits.length === 0) return null;

    // Como o LayerStack ordena Z de trás para frente, o primeiro hit mais próximo da câmera
    // (ou maior Z) vence.
    hits.sort((a, b) => b.object.parent.position.z - a.object.parent.position.z);
    return hits[0].object.userData.layerId ?? null;
  }

  _handlePointerMove(event) {
    if (!this._updatePointerNDC(event)) return;

    const hitId = this._pickInteractiveLayer();

    if (hitId !== this.hoveredLayerId) {
      if (this.hoveredLayerId) {
        this.layerStack.setLayerHover(this.hoveredLayerId, false);
        this.eventBus.emit('object:hover', { id: this.hoveredLayerId, hovered: false });
      }

      this.hoveredLayerId = hitId;

      if (this.hoveredLayerId) {
        this.layerStack.setLayerHover(this.hoveredLayerId, true);
        this.eventBus.emit('object:hover', { id: this.hoveredLayerId, hovered: true });
      }
    }

    this.domElement.style.cursor = this.hoveredLayerId ? 'pointer' : 'default';
  }

  _handlePointerDown(event) {
    if (event.button !== 0) return;
    if (!this._updatePointerNDC(event)) return;

    const hitId = this._pickInteractiveLayer();

    if (hitId) {
      this.eventBus.emit('object:click', { id: hitId });
    } else {
      this.eventBus.emit('scene:click');
    }
  }

  _handlePointerLeave() {
    if (this.hoveredLayerId) {
      const previousId = this.hoveredLayerId;
      this.layerStack.setLayerHover(previousId, false);
      this.hoveredLayerId = null;
      this.domElement.style.cursor = 'default';
      this.eventBus.emit('object:hover', { id: previousId, hovered: false });
    }
  }

  dispose() {
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement.removeEventListener('pointerleave', this._onPointerLeave);
  }
}
