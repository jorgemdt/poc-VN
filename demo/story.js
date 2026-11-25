/**
 * story.js
 * Roteiro completo da Demo Interativa do VN Framework POC.
 *
 * Demonstra sequencialmente todas as capacidades do framework:
 * - Ato 1: Empilhamento dinâmico de pares (Imagem + Efeito) e avanço por clique/botão
 * - Ato 2: Objeto interativo com Raycaster (hover + clique obrigatório)
 * - Ato 3: Shaders GLSL em tempo real (wave, tint, pulse) e escolhas ramificadas
 */
export const DEMO_STORY = [
  // =========================================================================
  // ATO 1 — Empilhamento de Pares (Imagem + Efeito) e Avanço de Diálogo
  // =========================================================================
  {
    type: 'bgm',
    track: 'arcane_theme'
  },
  {
    type: 'layer',
    id: 'bg',
    image: 'lab_arcano',
    effect: 'vignette',
    intensity: 0.85,
    color: '#060914',
    width: 1280,
    height: 720,
    fadeInDuration: 0.45
  },
  {
    type: 'say',
    speaker: 'Sistema',
    speakerColor: '#c792ea',
    text: 'Bem-vindo à Demo Interativa! Acabamos de criar o Par 1 ("bg"): a imagem do Laboratório Arcano com o shader de efeito "vignette" logo à frente dela.'
  },
  {
    type: 'layer',
    id: 'character',
    image: 'lyra_neutra',
    effect: 'pulse',
    intensity: 0.75,
    color: '#7aa2ff',
    x: -180,
    y: -30,
    width: 460,
    height: 640,
    scale: 0.92,
    fadeInDuration: 0.4
  },
  {
    type: 'say',
    speaker: 'Lyra',
    speakerColor: '#7aa2ff',
    text: 'Olá! Eu sou a Lyra — e estou no Par 2 ("character"), empilhada acima do cenário com um shader "pulse" aplicando um brilho rítmico ao meu redor.'
  },
  {
    type: 'say',
    speaker: 'Lyra',
    speakerColor: '#7aa2ff',
    text: 'Você pode avançar este diálogo clicando em qualquer área livre da cena WebGL ou usando o botão "Avançar ▶". Repare que esta caixa fica sempre acima do canvas!'
  },

  // =========================================================================
  // ATO 2 — Eventos de Mouse (Hover e Clique em Objeto na Cena)
  // =========================================================================
  {
    type: 'layer',
    id: 'orb',
    image: 'orbe_cristal',
    effect: 'pulse',
    intensity: 1.0,
    color: '#5eead4',
    x: 270,
    y: -40,
    width: 220,
    height: 220,
    interactive: true,
    fadeInDuration: 0.45
  },
  {
    type: 'say',
    speaker: 'Lyra',
    speakerColor: '#7aa2ff',
    text: 'Agora adicionei o Par 3 ("orb") acima de nós e marquei ele como interativo! Passe o mouse sobre o Orbe de Cristal à direita para ver o highlight e clique nele para ativá-lo.'
  },
  {
    type: 'waitInteraction',
    targetId: 'orb',
    hint: 'Passe o mouse e clique no Orbe de Cristal na cena à direita!'
  },

  // =========================================================================
  // ATO 3 — Shaders em Tempo Real e Botões de Escolha Ramificada
  // =========================================================================
  {
    type: 'effect',
    id: 'bg',
    effect: 'wave',
    intensity: 1.0,
    color: '#7aa2ff'
  },
  {
    type: 'layer',
    id: 'character',
    image: 'lyra_surpresa',
    fadeInDuration: 0.2
  },
  {
    type: 'say',
    speaker: 'Lyra',
    speakerColor: '#7aa2ff',
    text: 'Uau! O clique no Orbe disparou o shader "wave" em tempo real na camada de fundo e mudou minha expressão! O que devemos fazer com essa energia astral?'
  },
  {
    type: 'choice',
    choices: [
      {
        text: '🛡️ Estabilizar o Orbe (aplicar filtro "tint" azulado)',
        label: 'rota_estabilizar'
      },
      {
        text: '🌌 Liberar Energia Astral (trocar para o Jardim Astral)',
        label: 'rota_jardim'
      }
    ]
  },

  // --- Ramo A: Estabilizar o Orbe ---
  { type: 'label', name: 'rota_estabilizar' },
  {
    type: 'effect',
    id: 'bg',
    effect: 'tint',
    intensity: 0.85,
    color: '#3b82f6'
  },
  {
    type: 'layer',
    id: 'character',
    image: 'lyra_neutra',
    fadeInDuration: 0.25
  },
  {
    type: 'say',
    speaker: 'Lyra',
    speakerColor: '#7aa2ff',
    text: 'Perfeito! Você estabilizou o fluxo arcano. Trocamos o shader de distorção por um filtro atmosférico "tint" suave sobre o laboratório.'
  },
  { type: 'goto', label: 'epilogo' },

  // --- Ramo B: Liberar Energia Astral ---
  { type: 'label', name: 'rota_jardim' },
  {
    type: 'bgm',
    track: 'astral_theme'
  },
  {
    type: 'layer',
    id: 'bg',
    image: 'jardim_astral',
    effect: 'pulse',
    intensity: 0.7,
    color: '#c792ea',
    fadeInDuration: 0.5
  },
  {
    type: 'layer',
    id: 'character',
    image: 'lyra_neutra',
    fadeInDuration: 0.25
  },
  {
    type: 'say',
    speaker: 'Lyra',
    speakerColor: '#7aa2ff',
    text: 'Incrível! A energia transportou o cenário do Par 1 diretamente para o Jardim Astral, mantendo todas as outras camadas intactas acima dele!'
  },
  { type: 'goto', label: 'epilogo' },

  // =========================================================================
  // EPÍLOGO — Demonstração da Camada de UI Superior
  // =========================================================================
  { type: 'label', name: 'epilogo' },
  {
    type: 'say',
    speaker: 'Sistema',
    speakerColor: '#6ee7b7',
    text: 'Demo concluída! Agora experimente os botões na barra superior (camada UI z-index: 20): Salvar, Carregar, Alternar Efeito ao vivo, Histórico de falas e Reiniciar.'
  },
  {
    type: 'choice',
    choices: [
      {
        text: '🔄 Jogar a Demo novamente do início',
        label: 'reiniciar_fluxo'
      },
      {
        text: '✨ Testar o botão "Alternar Efeito" aqui mesmo',
        label: 'epilogo'
      }
    ]
  },
  { type: 'label', name: 'reiniciar_fluxo' },
  {
    type: 'removeLayer',
    id: 'orb'
  },
  {
    type: 'removeLayer',
    id: 'character'
  },
  { type: 'goto', label: 'inicio_loop' }
];

// Garante que "inicio_loop" exista no topo caso o usuário escolha rejogar
DEMO_STORY.unshift({ type: 'label', name: 'inicio_loop' });
