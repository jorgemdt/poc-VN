import * as THREE from 'three';

/**
 * Mapeamento de tipos de efeito para códigos inteiros consumidos pelo Fragment Shader.
 * Usar inteiros permite trocar o efeito em tempo real sem recompilar o programa GLSL.
 */
const EFFECT_MODE_MAP = {
  none: 0,
  vignette: 1,
  wave: 2,
  tint: 3,
  pulse: 4
};

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform float uTime;
  uniform int uMode;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uHover;
  uniform sampler2D uMap;
  uniform float uHasMap;

  void main() {
    vec4 color = vec4(0.0);

    if (uMode == 1) {
      // Vignette: escurecimento suave nas bordas para clima dramático
      float dist = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.32, 0.85, dist) * uIntensity;
      color = vec4(uColor * 0.08, vig);
    } else if (uMode == 2) {
      // Wave: distorção senoidal em tempo real sobre a textura da camada de imagem
      vec2 waveUv = vUv;
      float freq = 14.0;
      float amp = 0.014 * uIntensity;
      waveUv.x += sin(vUv.y * freq + uTime * 3.2) * amp;
      waveUv.y += cos(vUv.x * freq * 0.8 + uTime * 2.5) * (amp * 0.7);

      if (uHasMap > 0.5) {
        vec4 texel = texture2D(uMap, clamp(waveUv, 0.001, 0.999));
        // Leve brilho espectral acompanha as cristas da onda
        float shimmer = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 4.0);
        texel.rgb += uColor * (0.08 * uIntensity * shimmer);
        color = texel;
      } else {
        float bands = 0.5 + 0.5 * sin(vUv.y * 20.0 + uTime * 3.5);
        color = vec4(uColor, bands * 0.25 * uIntensity);
      }
    } else if (uMode == 3) {
      // Tint: filtro atmosférico de cor (ex.: pôr do sol, noite, alerta)
      color = vec4(uColor, 0.38 * uIntensity);
    } else if (uMode == 4) {
      // Pulse: aura/pulso rítmico guiado por uTime
      float pulse = 0.5 + 0.5 * sin(uTime * 3.2);
      float radial = 1.0 - smoothstep(0.15, 0.65, distance(vUv, vec2(0.5)));
      color = vec4(uColor, radial * (0.12 + 0.22 * pulse) * uIntensity);
    }

    // Destaque visual adicional quando o mouse está em hover sobre um objeto interativo
    if (uHover > 0.01) {
      float edgeDist = distance(vUv, vec2(0.5));
      float glow = (1.0 - smoothstep(0.18, 0.52, edgeDist)) * 0.35 * uHover;
      color.rgb = mix(color.rgb, vec3(0.75, 0.92, 1.0), 0.45 * uHover);
      color.a = max(color.a, glow);
    }

    color.a *= uOpacity;
    gl_FragColor = color;
  }
`;

/**
 * LayerStack.js
 * Gerencia a pilha dinâmica de N pares de camadas (ImageLayer + EffectLayer) no Three.js.
 *
 * Por que existe:
 * Garante a regra fundamental de profundidade: cada Camada de Efeito fica posicionada
 * imediatamente à frente de sua respectiva Camada de Imagem, e pares criados/ordenados
 * posteriormente ficam acima dos anteriores tanto no eixo Z quanto no renderOrder.
 */
export class LayerStack {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    /** @type {Array<object>} Lista ordenada de trás para frente */
    this.pairs = [];
    /** @type {Map<string, object>} */
    this.pairMap = new Map();
  }

  /**
   * Cria e empilha um novo par (Imagem + Efeito), ou atualiza se o ID já existir.
   * @param {string} id Identificador único do par (ex.: 'bg', 'character', 'orb').
   * @param {object} [options]
   * @param {THREE.Texture} [options.texture]
   * @param {number} [options.x=0]
   * @param {number} [options.y=0]
   * @param {number} [options.width=1280]
   * @param {number} [options.height=720]
   * @param {number} [options.scale=1]
   * @param {number} [options.opacity=1]
   * @param {boolean} [options.interactive=false]
   * @param {string} [options.effect='none']
   * @param {object} [options.effectParams]
   * @param {number} [options.fadeInDuration=0.35]
   */
  addLayerPair(id, options = {}) {
    if (this.pairMap.has(id)) {
      const existing = this.pairMap.get(id);
      if (options.texture) {
        this.setLayerImage(id, options.texture, options.fadeInDuration ?? 0.3);
      }
      if (options.x !== undefined || options.y !== undefined) {
        existing.group.position.x = options.x ?? existing.group.position.x;
        existing.group.position.y = options.y ?? existing.group.position.y;
      }
      if (options.scale !== undefined) {
        existing.baseScale = options.scale;
      }
      if (options.interactive !== undefined) {
        existing.interactive = options.interactive;
        existing.imageMesh.userData.interactive = options.interactive;
      }
      if (options.effect !== undefined) {
        this.setLayerEffect(id, options.effect, options.effectParams);
      }
      return existing;
    }

    const width = options.width ?? 1280;
    const height = options.height ?? 720;
    const geometry = new THREE.PlaneGeometry(width, height);

    const targetOpacity = options.opacity ?? 1;
    const fadeDuration = options.fadeInDuration ?? 0.35;
    const initialOpacity = fadeDuration > 0 ? 0 : targetOpacity;

    // 1. Camada de Imagem (ImageLayer)
    const imageMaterial = new THREE.MeshBasicMaterial({
      map: options.texture ?? null,
      transparent: true,
      opacity: initialOpacity,
      depthWrite: false
    });
    const imageMesh = new THREE.Mesh(geometry, imageMaterial);
    imageMesh.name = `image:${id}`;
    imageMesh.userData = {
      layerId: id,
      interactive: Boolean(options.interactive)
    };

    // 2. Camada de Efeito (EffectLayer) imediatamente à frente da imagem
    const effectMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMode: { value: EFFECT_MODE_MAP[options.effect ?? 'none'] ?? 0 },
        uIntensity: { value: options.effectParams?.intensity ?? 0.8 },
        uColor: { value: new THREE.Color(options.effectParams?.color ?? '#7aa2ff') },
        uOpacity: { value: initialOpacity },
        uHover: { value: 0 },
        uMap: { value: options.texture ?? null },
        uHasMap: { value: options.texture ? 1.0 : 0.0 }
      }
    });
    const effectMesh = new THREE.Mesh(geometry, effectMaterial);
    effectMesh.name = `effect:${id}`;
    effectMesh.position.z = 0.05;

    const group = new THREE.Group();
    group.position.set(options.x ?? 0, options.y ?? 0, 0);
    const baseScale = options.scale ?? 1;
    group.scale.set(baseScale, baseScale, 1);

    group.add(imageMesh);
    group.add(effectMesh);
    this.scene.add(group);

    const pair = {
      id,
      group,
      geometry,
      imageMesh,
      imageMaterial,
      effectMesh,
      effectMaterial,
      interactive: Boolean(options.interactive),
      hovered: false,
      baseScale,
      currentScale: baseScale,
      hoverStrength: 0,
      currentOpacity: initialOpacity,
      targetOpacity,
      fadeDuration,
      effectType: options.effect ?? 'none',
      effectParams: { ...(options.effectParams ?? {}) }
    };

    this.pairs.push(pair);
    this.pairMap.set(id, pair);
    this._reindexStack();

    return pair;
  }

  /**
   * Atualiza a textura da Camada de Imagem com suporte a transição suave de opacidade.
   * @param {string} id
   * @param {THREE.Texture} texture
   * @param {number} [transition=0.3] Duração do fade-in em segundos.
   */
  setLayerImage(id, texture, transition = 0.3) {
    const pair = this.pairMap.get(id);
    if (!pair) return;

    pair.imageMaterial.map = texture;
    pair.imageMaterial.needsUpdate = true;

    pair.effectMaterial.uniforms.uMap.value = texture;
    pair.effectMaterial.uniforms.uHasMap.value = texture ? 1.0 : 0.0;

    if (transition > 0) {
      pair.currentOpacity = 0.15;
      pair.targetOpacity = 1;
      pair.fadeDuration = transition;
    } else {
      pair.currentOpacity = 1;
      pair.targetOpacity = 1;
      pair.imageMaterial.opacity = 1;
      pair.effectMaterial.uniforms.uOpacity.value = 1;
    }
  }

  /**
   * Altera o shader ativo da Camada de Efeito de um par existente.
   * @param {string} id
   * @param {'none'|'vignette'|'wave'|'tint'|'pulse'} effectType
   * @param {object} [params]
   * @param {number} [params.intensity]
   * @param {string|number} [params.color]
   */
  setLayerEffect(id, effectType, params = {}) {
    const pair = this.pairMap.get(id);
    if (!pair) return;

    const mode = EFFECT_MODE_MAP[effectType] ?? 0;
    pair.effectType = effectType;
    pair.effectParams = { ...pair.effectParams, ...params };

    const uniforms = pair.effectMaterial.uniforms;
    uniforms.uMode.value = mode;
    if (params.intensity !== undefined) {
      uniforms.uIntensity.value = params.intensity;
    }
    if (params.color !== undefined) {
      uniforms.uColor.value.set(params.color);
    }
  }

  /**
   * Remove um par de camadas da cena e libera recursos da GPU.
   * @param {string} id
   */
  removeLayerPair(id) {
    const pair = this.pairMap.get(id);
    if (!pair) return;

    this.scene.remove(pair.group);
    pair.geometry.dispose();
    pair.imageMaterial.dispose();
    pair.effectMaterial.dispose();

    this.pairMap.delete(id);
    this.pairs = this.pairs.filter((p) => p.id !== id);
    this._reindexStack();
  }

  /**
   * Remove todos os pares da pilha (útil ao reiniciar a demo ou restaurar estado).
   */
  clearAll() {
    for (const id of [...this.pairMap.keys()]) {
      this.removeLayerPair(id);
    }
  }

  /**
   * Define estado de hover para um par interativo (dispara escala + brilho no shader).
   * @param {string|null} id
   * @param {boolean} isHovered
   */
  setLayerHover(id, isHovered) {
    const pair = this.pairMap.get(id);
    if (!pair) return;
    pair.hovered = isHovered;
  }

  /**
   * Retorna os meshes de imagem marcados como interativos para uso no Raycaster.
   * @returns {THREE.Mesh[]}
   */
  getInteractiveMeshes() {
    return this.pairs.filter((p) => p.interactive).map((p) => p.imageMesh);
  }

  /**
   * Retorna informações resumidas de um par (útil para UI de debug/alternância de efeito).
   * @param {string} id
   */
  getLayerPair(id) {
    return this.pairMap.get(id) ?? null;
  }

  /**
   * Atualiza shaders (uTime), transições de opacidade e animações de hover a cada frame.
   * @param {number} deltaTime
   * @param {number} elapsedTime
   */
  update(deltaTime, elapsedTime) {
    for (const pair of this.pairs) {
      // Atualiza tempo global do shader da camada de efeito
      pair.effectMaterial.uniforms.uTime.value = elapsedTime;

      // Interpola opacidade para transições suaves (fade in/out)
      if (Math.abs(pair.currentOpacity - pair.targetOpacity) > 0.001) {
        const speed = pair.fadeDuration > 0 ? 1 / pair.fadeDuration : 10;
        const step = speed * deltaTime;
        if (pair.currentOpacity < pair.targetOpacity) {
          pair.currentOpacity = Math.min(pair.targetOpacity, pair.currentOpacity + step);
        } else {
          pair.currentOpacity = Math.max(pair.targetOpacity, pair.currentOpacity - step);
        }
        pair.imageMaterial.opacity = pair.currentOpacity;
        pair.effectMaterial.uniforms.uOpacity.value = pair.currentOpacity;
      }

      // Interpola escala e brilho de hover em objetos interativos
      const targetHover = pair.hovered ? 1 : 0;
      pair.hoverStrength += (targetHover - pair.hoverStrength) * Math.min(1, deltaTime * 12);
      pair.effectMaterial.uniforms.uHover.value = pair.hoverStrength;

      const targetScale = pair.baseScale * (pair.hovered ? 1.07 : 1.0);
      pair.currentScale += (targetScale - pair.currentScale) * Math.min(1, deltaTime * 12);
      pair.group.scale.set(pair.currentScale, pair.currentScale, 1);
    }
  }

  /**
   * Recalcula posição Z e renderOrder para garantir empilhamento estrito de trás para frente.
   */
  _reindexStack() {
    this.pairs.forEach((pair, index) => {
      pair.group.position.z = index * 2;
      pair.imageMesh.renderOrder = index * 2;
      pair.effectMesh.renderOrder = index * 2 + 1;
    });
  }
}
