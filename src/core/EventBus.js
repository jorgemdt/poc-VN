/**
 * EventBus.js
 * Barramento de eventos desacoplado (padrão Publish/Subscribe).
 *
 * Por que existe:
 * Em um framework modular de Visual Novel, a camada de entrada (MouseController),
 * o motor de roteiro (StoryRunner) e as camadas de UI (DialogueBox, HudMenu)
 * não devem depender diretamente umas das outras. O EventBus centraliza a
 * comunicação via eventos nomeados (ex.: 'scene:click', 'object:click', 'dialogue:next').
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Registra um callback para um evento específico.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Função utilitária para cancelar a inscrição rapidamente.
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Remove um callback previamente registrado de um evento.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    callbacks.delete(callback);
    if (callbacks.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Dispara um evento para todos os ouvintes inscritos, passando um payload opcional.
   * @param {string} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    // Iteramos sobre uma cópia para evitar problemas caso um listener se remova durante a execução.
    for (const callback of [...callbacks]) {
      callback(payload);
    }
  }
}
