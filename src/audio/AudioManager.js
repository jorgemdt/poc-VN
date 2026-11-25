/**
 * AudioManager.js
 * Gerenciador de áudio procedural usando a Web Audio API nativa do navegador.
 *
 * Por que existe:
 * Assim como o AssetGenerator gera texturas em memória sem depender de arquivos externos,
 * o AudioManager sintetiza música ambiente (BGM) e efeitos sonoros de eventos (SFX)
 * diretamente na GPU/DSP de áudio do navegador, evitando erros de CORS ou assets ausentes
 * e respeitando a política de autoplay (desbloqueio no primeiro gesto do usuário).
 */
export class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;

    this.isMuted = false;
    this.currentTrack = null;
    this.bgmInterval = null;
    this.bgmNodes = [];
    this.stepIndex = 0;
  }

  /**
   * Inicializa ou retoma o AudioContext (deve ser chamado em resposta a um gesto do usuário).
   */
  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.28;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.45;
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Alterna entre mudo e com som.
   * @returns {boolean} Novo estado de mudo.
   */
  toggleMute() {
    this.unlock();
    this.isMuted = !this.isMuted;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : 0.85,
        this.ctx.currentTime,
        0.04
      );
    }
    return this.isMuted;
  }

  /**
   * Inicia uma trilha de música de fundo procedural com transição suave.
   * @param {'arcane_theme'|'astral_theme'|'stop'} trackName
   */
  playBgm(trackName) {
    this.unlock();
    if (!this.ctx) return;

    if (trackName === 'stop' || !trackName) {
      this.stopBgm();
      return;
    }

    if (this.currentTrack === trackName) return;

    this.stopBgm();
    this.currentTrack = trackName;
    this.stepIndex = 0;

    // Configuração musical de cada tema (acordes e arpejos em Hz)
    const themes = {
      arcane_theme: {
        padFreqs: [146.83, 220.0, 261.63], // Ré menor atmosférico (D3, A3, C4)
        arpNotes: [293.66, 349.23, 440.0, 523.25, 440.0, 349.23],
        tempoMs: 650,
        waveType: 'triangle'
      },
      astral_theme: {
        padFreqs: [196.0, 246.94, 293.66, 369.99], // Sol maior sétima etéreo (G3, B3, D4, F#4)
        arpNotes: [392.0, 493.88, 587.33, 739.99, 587.33, 493.88],
        tempoMs: 520,
        waveType: 'sine'
      }
    };

    const theme = themes[trackName] ?? themes.arcane_theme;
    const now = this.ctx.currentTime;

    // Pad contínuo filtrado (fundo ambiente)
    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(620, now);
    padFilter.connect(this.bgmGain);

    const padEnvelope = this.ctx.createGain();
    padEnvelope.gain.setValueAtTime(0.001, now);
    padEnvelope.gain.exponentialRampToValueAtTime(0.22, now + 1.4);
    padEnvelope.connect(padFilter);

    for (const freq of theme.padFreqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(padEnvelope);
      osc.start(now);
      this.bgmNodes.push(osc);
    }
    this.bgmNodes.push(padEnvelope, padFilter);

    // Loop de arpejo suave para dar movimento à música
    const playArpNote = () => {
      if (!this.ctx || this.currentTrack !== trackName) return;
      const t = this.ctx.currentTime;
      const freq = theme.arpNotes[this.stepIndex % theme.arpNotes.length];
      this.stepIndex += 1;

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = theme.waveType;
      osc.frequency.setValueAtTime(freq, t);

      noteGain.gain.setValueAtTime(0.001, t);
      noteGain.gain.exponentialRampToValueAtTime(0.14, t + 0.06);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.connect(noteGain);
      noteGain.connect(this.bgmGain);

      osc.start(t);
      osc.stop(t + 0.6);
    };

    playArpNote();
    this.bgmInterval = window.setInterval(playArpNote, theme.tempoMs);
  }

  /**
   * Interrompe a música de fundo atual.
   */
  stopBgm() {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }

    for (const node of this.bgmNodes) {
      try {
        if (typeof node.stop === 'function') {
          node.stop();
        }
        node.disconnect();
      } catch {
        // Ignora nós já encerrados
      }
    }
    this.bgmNodes = [];
    this.currentTrack = null;
  }

  /**
   * Toca um efeito sonoro curto associado a eventos da cena ou da UI.
   * @param {'next'|'hover'|'orb_activate'|'choice'|'save'|'effect_toggle'} name
   */
  playSfx(name) {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    switch (name) {
      case 'next': {
        this._tone(587.33, 'sine', now, 0.08, 0.14);
        break;
      }

      case 'hover': {
        this._tone(880, 'sine', now, 0.06, 0.07);
        break;
      }

      case 'choice': {
        this._tone(523.25, 'triangle', now, 0.1, 0.18);
        this._tone(783.99, 'triangle', now + 0.07, 0.14, 0.18);
        break;
      }

      case 'orb_activate': {
        // Acorde ascendente mágico ao clicar no Orbe de Cristal
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, i) => {
          this._tone(freq, 'sine', now + i * 0.06, 0.35, 0.22);
        });
        break;
      }

      case 'save': {
        this._tone(659.25, 'sine', now, 0.1, 0.16);
        this._tone(987.77, 'sine', now + 0.08, 0.18, 0.16);
        break;
      }

      case 'effect_toggle': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.17);
        break;
      }

      default:
        break;
    }
  }

  _tone(freq, type, startTime, duration, peakGain) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  dispose() {
    this.stopBgm();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
