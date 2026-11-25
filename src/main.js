import { EventBus } from './core/EventBus.js';
import { Engine } from './core/Engine.js';
import { LayerStack } from './core/LayerStack.js';
import { StoryRunner } from './core/StoryRunner.js';
import { AudioManager } from './audio/AudioManager.js';
import { MouseController } from './input/MouseController.js';
import { DialogueBox } from './ui/DialogueBox.js';
import { HudMenu } from './ui/HudMenu.js';
import { AssetGenerator } from '../demo/AssetGenerator.js';
import { DEMO_STORY } from '../demo/story.js';

const SAVE_STORAGE_KEY = 'vn_framework_poc_save_v1';
const EFFECT_CYCLE = ['vignette', 'wave', 'tint', 'pulse', 'none'];

/**
 * Ponto de entrada da aplicação.
 * Conecta os módulos core/, input/, ui/ e inicializa a Demo Interativa.
 */
function bootstrap() {
  const sceneContainer = document.getElementById('scene-container');
  const dialogueContainer = document.getElementById('dialogue-layer');
  const uiContainer = document.getElementById('ui-layer');

  const eventBus = new EventBus();
  const engine = new Engine(sceneContainer, { logicalWidth: 1280, logicalHeight: 720 });
  const layerStack = new LayerStack(engine.scene);
  const audioManager = new AudioManager();
  const mouseController = new MouseController(engine, layerStack, eventBus);

  const dialogueBox = new DialogueBox(dialogueContainer, eventBus);
  const hudMenu = new HudMenu(uiContainer, eventBus);

  // Gera texturas procedurais em memória (sem arquivos externos)
  const textures = AssetGenerator.createDemoTextures();

  const storyRunner = new StoryRunner({
    layerStack,
    dialogueBox,
    eventBus,
    textures,
    audioManager,
    onBackgroundEffectChange: (effectName) => {
      hudMenu.setActiveEffectLabel(effectName);
    }
  });

  storyRunner.loadScript(DEMO_STORY);

  // Atualiza shaders e transições de camadas a cada frame
  engine.onUpdate((deltaTime, elapsedTime) => {
    layerStack.update(deltaTime, elapsedTime);
  });
  engine.start();

  // Cena de fundo animada exibida atrás do Menu Principal logo ao abrir o index.html
  layerStack.addLayerPair('bg', {
    texture: textures.get('lab_arcano'),
    effect: 'pulse',
    effectParams: { intensity: 0.65, color: '#7aa2ff' },
    fadeInDuration: 0.4
  });
  hudMenu.setActiveEffectLabel('pulse');

  // --- Eventos de Áudio (SFX reativos a eventos da cena e diálogo) ---
  eventBus.on('dialogue:next', () => audioManager.playSfx('next'));
  eventBus.on('dialogue:choice', () => audioManager.playSfx('choice'));
  eventBus.on('object:hover', ({ hovered }) => {
    if (hovered) audioManager.playSfx('hover');
  });
  eventBus.on('object:click', () => audioManager.playSfx('orb_activate'));

  // --- Eventos da camada de UI (z-index: 20) ---
  eventBus.on('ui:startDemo', () => {
    audioManager.unlock();
    storyRunner.start();
  });

  eventBus.on('ui:restart', () => {
    audioManager.unlock();
    hudMenu.hideMainMenu();
    storyRunner.start();
    hudMenu.showToast('Demo reiniciada');
  });

  eventBus.on('ui:toggleMute', () => {
    const muted = audioManager.toggleMute();
    hudMenu.setMutedLabel(muted);
    hudMenu.showToast(muted ? 'Áudio silenciado' : 'Áudio ativado');
  });

  eventBus.on('ui:openMenu', () => {
    hudMenu.showMainMenu();
  });

  eventBus.on('ui:openHistory', () => {
    hudMenu.showHistory(storyRunner.history);
  });

  eventBus.on('ui:toggleEffect', () => {
    const bgPair = layerStack.getLayerPair('bg');
    if (!bgPair) return;

    const currentIdx = EFFECT_CYCLE.indexOf(bgPair.effectType);
    const nextEffect = EFFECT_CYCLE[(currentIdx + 1) % EFFECT_CYCLE.length];

    layerStack.setLayerEffect('bg', nextEffect, {
      intensity: 0.85,
      color: nextEffect === 'tint' ? '#c792ea' : '#7aa2ff'
    });
    audioManager.playSfx('effect_toggle');
    hudMenu.setActiveEffectLabel(nextEffect);
    hudMenu.showToast(`Shader do fundo: ${nextEffect}`);
  });

  eventBus.on('ui:save', () => {
    if (!storyRunner.isRunning) {
      hudMenu.showToast('Inicie a demo antes de salvar');
      return;
    }
    const state = storyRunner.exportState();
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
    audioManager.playSfx('save');
    hudMenu.showToast('Progresso salvo no navegador!');
  });

  eventBus.on('ui:load', () => {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      hudMenu.showToast('Nenhum progresso salvo encontrado');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const ok = storyRunner.importState(parsed);
      if (ok) {
        audioManager.playSfx('save');
        hudMenu.hideMainMenu();
        hudMenu.showToast('Progresso carregado!');
      }
    } catch (err) {
      console.error('Erro ao carregar progresso:', err);
      hudMenu.showToast('Erro ao ler dados salvos');
    }
  });

  // Garante limpeza caso a página seja encerrada
  window.addEventListener('beforeunload', () => {
    audioManager.dispose();
    mouseController.dispose();
    engine.dispose();
  });
}

bootstrap();
