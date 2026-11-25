/**
 * DialogueBox.js
 * Controla a Camada de Balão de Diálogo (DOM z-index: 10), efeito typewriter e botões de escolha.
 *
 * Por que existe:
 * Mantém o texto nítido, acessível e responsivo no DOM acima do <canvas> WebGL,
 * gerenciando o ritmo de leitura (completar digitação no primeiro clique, avançar no segundo)
 * e bloqueando o avanço acidental quando há escolhas ou interações obrigatórias na cena.
 */
export class DialogueBox {
  /**
   * @param {HTMLElement} container Elemento #dialogue-layer.
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;

    this.fullText = '';
    this.charIndex = 0;
    this.isTyping = false;
    this.typingTimer = null;
    this.typingSpeedMs = 20;

    this.hasChoices = false;
    this.waitingInteraction = false;

    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    this.wrapperEl = document.createElement('div');
    this.wrapperEl.className = 'dialogue-wrapper is-hidden';

    this.choicesEl = document.createElement('div');
    this.choicesEl.className = 'choices-container';

    this.boxEl = document.createElement('div');
    this.boxEl.className = 'dialogue-box';

    this.speakerEl = document.createElement('div');
    this.speakerEl.className = 'dialogue-speaker';

    this.textEl = document.createElement('div');
    this.textEl.className = 'dialogue-text';

    this.footerEl = document.createElement('div');
    this.footerEl.className = 'dialogue-footer';

    this.hintEl = document.createElement('span');
    this.hintEl.className = 'dialogue-hint';
    this.hintEl.textContent = 'Clique na cena ou no botão para avançar';

    this.nextBtnEl = document.createElement('button');
    this.nextBtnEl.type = 'button';
    this.nextBtnEl.className = 'dialogue-next-btn';
    this.nextBtnEl.textContent = 'Avançar ▶';

    this.footerEl.append(this.hintEl, this.nextBtnEl);
    this.boxEl.append(this.speakerEl, this.textEl, this.footerEl);
    this.wrapperEl.append(this.choicesEl, this.boxEl);
    this.container.appendChild(this.wrapperEl);
  }

  _bindEvents() {
    // Clique no balão ou no botão Avançar
    this.boxEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleAdvanceRequest();
    });

    this.nextBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleAdvanceRequest();
    });

    // Clique em áreas vazias da cena WebGL (emitido pelo MouseController)
    this.eventBus.on('scene:click', () => {
      if (!this.isVisible()) return;
      this.handleAdvanceRequest();
    });
  }

  /**
   * Exibe uma nova fala com efeito typewriter.
   * @param {object} options
   * @param {string} [options.speaker='']
   * @param {string} [options.speakerColor='#7aa2ff']
   * @param {string} options.text
   */
  showLine({ speaker = '', speakerColor = '#7aa2ff', text = '' }) {
    this.clearChoices();
    this.setWaitingInteraction(false);
    this.show();

    this.speakerEl.textContent = speaker;
    this.speakerEl.style.color = speakerColor;

    this.fullText = text;
    this.charIndex = 0;
    this.textEl.textContent = '';
    this._stopTyping();

    if (!text) {
      this.isTyping = false;
      return;
    }

    this.isTyping = true;
    this.typingTimer = window.setInterval(() => {
      this.charIndex += 1;
      this.textEl.textContent = this.fullText.slice(0, this.charIndex);

      if (this.charIndex >= this.fullText.length) {
        this._stopTyping();
        this.isTyping = false;
      }
    }, this.typingSpeedMs);
  }

  /**
   * Completa imediatamente o texto caso ainda esteja digitando.
   */
  completeTyping() {
    if (!this.isTyping) return;
    this._stopTyping();
    this.isTyping = false;
    this.charIndex = this.fullText.length;
    this.textEl.textContent = this.fullText;
  }

  /**
   * Trata solicitação de avanço (clique no balão, botão ou cena).
   */
  handleAdvanceRequest() {
    if (this.isTyping) {
      this.completeTyping();
      return;
    }

    // Bloqueia avanço se houver botões de escolha ou se estivermos aguardando clique em objeto da cena
    if (this.hasChoices || this.waitingInteraction) {
      return;
    }

    this.eventBus.emit('dialogue:next');
  }

  /**
   * Renderiza botões dinâmicos de decisão acima do balão de diálogo.
   * @param {Array<{ text: string, label: string }>} choices
   */
  renderChoices(choices) {
    this.clearChoices();
    this.hasChoices = choices.length > 0;
    this.nextBtnEl.classList.add('is-hidden');
    this.hintEl.textContent = 'Selecione uma opção acima para continuar';

    for (const choice of choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearChoices();
        this.eventBus.emit('dialogue:choice', choice);
      });
      this.choicesEl.appendChild(btn);
    }
  }

  clearChoices() {
    this.choicesEl.innerHTML = '';
    this.hasChoices = false;
    if (!this.waitingInteraction) {
      this.nextBtnEl.classList.remove('is-hidden');
      this.hintEl.textContent = 'Clique na cena ou no botão para avançar';
    }
  }

  /**
   * Coloca o balão em modo de espera por interação direta em um objeto da cena.
   * @param {boolean} isWaiting
   * @param {string} [hint]
   */
  setWaitingInteraction(isWaiting, hint = 'Interaja com o objeto destacado na cena') {
    this.waitingInteraction = isWaiting;
    if (isWaiting) {
      this.nextBtnEl.classList.add('is-hidden');
      this.hintEl.textContent = hint;
    } else if (!this.hasChoices) {
      this.nextBtnEl.classList.remove('is-hidden');
      this.hintEl.textContent = 'Clique na cena ou no botão para avançar';
    }
  }

  show() {
    this.wrapperEl.classList.remove('is-hidden');
  }

  hide() {
    this.wrapperEl.classList.add('is-hidden');
  }

  isVisible() {
    return !this.wrapperEl.classList.contains('is-hidden');
  }

  _stopTyping() {
    if (this.typingTimer !== null) {
      clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
  }
}
