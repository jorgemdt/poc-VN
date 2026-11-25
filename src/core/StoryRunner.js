/**
 * StoryRunner.js
 * Interpretador de roteiro linear/ramificado com suporte a rótulos (label) e saltos (goto).
 *
 * Por que existe:
 * Desacopla a narrativa declarativa (objetos JSON/JS em demo/story.js) da execução
 * imperativa no Three.js e no DOM. Cada comando do roteiro aciona LayerStack,
 * DialogueBox ou aguarda eventos no EventBus antes de avançar para o próximo passo.
 */
export class StoryRunner {
  /**
   * @param {object} deps
   * @param {import('./LayerStack.js').LayerStack} deps.layerStack
   * @param {import('../ui/DialogueBox.js').DialogueBox} deps.dialogueBox
   * @param {import('./EventBus.js').EventBus} deps.eventBus
   * @param {Map<string, import('three').Texture>} deps.textures
   * @param {import('../audio/AudioManager.js').AudioManager} [deps.audioManager]
   * @param {Function} [deps.onBackgroundEffectChange]
   */
  constructor({ layerStack, dialogueBox, eventBus, textures, audioManager, onBackgroundEffectChange }) {
    this.layerStack = layerStack;
    this.dialogueBox = dialogueBox;
    this.eventBus = eventBus;
    this.textures = textures;
    this.audioManager = audioManager ?? null;
    this.onBackgroundEffectChange = onBackgroundEffectChange;

    this.script = [];
    this.labels = new Map();
    this.currentIndex = 0;
    this.history = [];
    this.activeLayerConfigs = [];
    this.currentBgm = null;
    this.waitingTargetId = null;
    this.isRunning = false;

    this._bindEvents();
  }

  _bindEvents() {
    this.eventBus.on('dialogue:next', () => {
      if (!this.isRunning || this.waitingTargetId !== null) return;
      this.currentIndex += 1;
      this._executeCurrentStep();
    });

    this.eventBus.on('dialogue:choice', (choice) => {
      if (!this.isRunning || !choice?.label) return;
      this.jumpToLabel(choice.label);
    });

    this.eventBus.on('object:click', ({ id }) => {
      if (!this.isRunning || this.waitingTargetId === null) return;
      if (id === this.waitingTargetId) {
        this.waitingTargetId = null;
        this.dialogueBox.setWaitingInteraction(false);
        this.currentIndex += 1;
        this._executeCurrentStep();
      }
    });
  }

  /**
   * Carrega um roteiro e indexa todos os rótulos (label) para saltos O(1).
   * @param {Array<object>} script
   */
  loadScript(script) {
    this.script = script;
    this.labels.clear();

    script.forEach((step, index) => {
      if (step.type === 'label' && step.name) {
        this.labels.set(step.name, index);
      }
    });
  }

  /**
   * Inicia (ou reinicia) a execução do roteiro a partir do índice 0.
   */
  start() {
    this.layerStack.clearAll();
    this.activeLayerConfigs = [];
    this.history = [];
    this.waitingTargetId = null;
    this.currentIndex = 0;
    this.isRunning = true;
    this._executeCurrentStep();
  }

  /**
   * Salta diretamente para um rótulo registrado no roteiro.
   * @param {string} labelName
   */
  jumpToLabel(labelName) {
    const targetIndex = this.labels.get(labelName);
    if (targetIndex === undefined) {
      console.warn(`[StoryRunner] Rótulo não encontrado: "${labelName}"`);
      return;
    }
    this.waitingTargetId = null;
    this.dialogueBox.setWaitingInteraction(false);
    this.currentIndex = targetIndex;
    this._executeCurrentStep();
  }

  /**
   * Executa comandos síncronos em sequência até encontrar um comando bloqueante
   * (say, choice, waitInteraction) ou o fim do roteiro.
   */
  _executeCurrentStep() {
    while (this.isRunning && this.currentIndex < this.script.length) {
      const step = this.script[this.currentIndex];

      switch (step.type) {
        case 'label': {
          this.currentIndex += 1;
          break;
        }

        case 'layer': {
          this._applyLayerCommand(step);
          this.currentIndex += 1;
          break;
        }

        case 'removeLayer': {
          this.layerStack.removeLayerPair(step.id);
          this.activeLayerConfigs = this.activeLayerConfigs.filter((c) => c.id !== step.id);
          this.currentIndex += 1;
          break;
        }

        case 'effect': {
          this._applyEffectCommand(step);
          this.currentIndex += 1;
          break;
        }

        case 'bgm': {
          this.currentBgm = step.track === 'stop' ? null : step.track;
          this.audioManager?.playBgm(step.track);
          this.currentIndex += 1;
          break;
        }

        case 'sfx': {
          this.audioManager?.playSfx(step.name);
          this.currentIndex += 1;
          break;
        }

        case 'goto': {
          const targetIndex = this.labels.get(step.label);
          if (targetIndex !== undefined) {
            this.currentIndex = targetIndex;
          } else {
            console.warn(`[StoryRunner] goto para rótulo inexistente: "${step.label}"`);
            this.currentIndex += 1;
          }
          break;
        }

        case 'say': {
          this.history.push({
            speaker: step.speaker ?? '',
            speakerColor: step.speakerColor ?? '#7aa2ff',
            text: step.text
          });
          this.dialogueBox.showLine({
            speaker: step.speaker,
            speakerColor: step.speakerColor,
            text: step.text
          });
          return; // Aguarda 'dialogue:next'
        }

        case 'waitInteraction': {
          this.waitingTargetId = step.targetId;
          this.dialogueBox.setWaitingInteraction(
            true,
            step.hint ?? `Clique no objeto "${step.targetId}" na cena para continuar`
          );
          return; // Aguarda 'object:click'
        }

        case 'choice': {
          this.dialogueBox.renderChoices(step.choices ?? []);
          return; // Aguarda 'dialogue:choice'
        }

        default: {
          console.warn(`[StoryRunner] Comando desconhecido:`, step);
          this.currentIndex += 1;
        }
      }
    }
  }

  _applyLayerCommand(step) {
    const texture = step.image ? this.textures.get(step.image) : undefined;
    const effectParams = {
      ...(step.effectParams ?? {}),
      ...(step.intensity !== undefined ? { intensity: step.intensity } : {}),
      ...(step.color !== undefined ? { color: step.color } : {})
    };

    this.layerStack.addLayerPair(step.id, {
      texture,
      x: step.x,
      y: step.y,
      width: step.width,
      height: step.height,
      scale: step.scale,
      opacity: step.opacity,
      interactive: step.interactive,
      effect: step.effect,
      effectParams,
      fadeInDuration: step.fadeInDuration
    });

    // Atualiza snapshot serializável para Salvar/Carregar
    const existingIdx = this.activeLayerConfigs.findIndex((c) => c.id === step.id);
    const mergedConfig = {
      ...(existingIdx >= 0 ? this.activeLayerConfigs[existingIdx] : {}),
      ...step,
      effectParams
    };
    if (existingIdx >= 0) {
      this.activeLayerConfigs[existingIdx] = mergedConfig;
    } else {
      this.activeLayerConfigs.push(mergedConfig);
    }

    if (step.id === 'bg' && step.effect && this.onBackgroundEffectChange) {
      this.onBackgroundEffectChange(step.effect);
    }
  }

  _applyEffectCommand(step) {
    const params = {
      ...(step.effectParams ?? {}),
      ...(step.intensity !== undefined ? { intensity: step.intensity } : {}),
      ...(step.color !== undefined ? { color: step.color } : {})
    };

    this.layerStack.setLayerEffect(step.id, step.effect, params);

    const cfg = this.activeLayerConfigs.find((c) => c.id === step.id);
    if (cfg) {
      cfg.effect = step.effect;
      cfg.effectParams = { ...(cfg.effectParams ?? {}), ...params };
    }

    if (step.id === 'bg' && this.onBackgroundEffectChange) {
      this.onBackgroundEffectChange(step.effect);
    }
  }

  /**
   * Exporta estado completo para persistência em localStorage.
   */
  exportState() {
    return {
      currentIndex: this.currentIndex,
      history: this.history,
      activeLayerConfigs: this.activeLayerConfigs,
      currentBgm: this.currentBgm
    };
  }

  /**
   * Restaura estado salvo previamente em localStorage.
   * @param {object} savedState
   */
  importState(savedState) {
    if (!savedState || typeof savedState.currentIndex !== 'number') return false;

    this.layerStack.clearAll();
    this.activeLayerConfigs = [];
    this.waitingTargetId = null;
    this.dialogueBox.setWaitingInteraction(false);

    for (const layerCfg of savedState.activeLayerConfigs ?? []) {
      this._applyLayerCommand({ ...layerCfg, fadeInDuration: 0 });
    }

    if (savedState.currentBgm) {
      this.currentBgm = savedState.currentBgm;
      this.audioManager?.playBgm(savedState.currentBgm);
    } else {
      this.currentBgm = null;
      this.audioManager?.stopBgm();
    }

    this.history = Array.isArray(savedState.history) ? [...savedState.history] : [];
    // Remove o último item do histórico caso o passo atual seja 'say', pois ele será re-adicionado
    const currentStep = this.script[savedState.currentIndex];
    if (currentStep?.type === 'say' && this.history.length > 0) {
      this.history.pop();
    }

    this.currentIndex = savedState.currentIndex;
    this.isRunning = true;
    this._executeCurrentStep();
    return true;
  }
}
