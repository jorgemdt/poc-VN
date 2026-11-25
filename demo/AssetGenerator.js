import * as THREE from 'three';

/**
 * AssetGenerator.js
 * Gera texturas procedurais (THREE.CanvasTexture) em memória via Canvas 2D.
 *
 * Por que existe:
 * Elimina dependência de arquivos externos de imagem e erros de CORS ao abrir
 * a demo diretamente em servidores estáticos simples, garantindo carregamento
 * instantâneo e nítido de cenários, personagem (com expressões) e objeto interativo.
 */
export class AssetGenerator {
  /**
   * Gera todas as texturas necessárias para a demo e retorna um Map<nome, THREE.Texture>.
   * @returns {Map<string, THREE.Texture>}
   */
  static createDemoTextures() {
    const textures = new Map();

    textures.set('lab_arcano', this._createArcaneLabTexture());
    textures.set('jardim_astral', this._createAstralGardenTexture());
    textures.set('lyra_neutra', this._createLyraTexture('neutral'));
    textures.set('lyra_surpresa', this._createLyraTexture('surprised'));
    textures.set('orbe_cristal', this._createCrystalOrbTexture());

    return textures;
  }

  static _toTexture(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  static _createArcaneLabTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Fundo noturno profundo do laboratório
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 720);
    bgGrad.addColorStop(0, '#0d1326');
    bgGrad.addColorStop(0.6, '#1a2040');
    bgGrad.addColorStop(1, '#121024');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Janela gótica central com luar
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(490, 460);
    ctx.lineTo(490, 210);
    ctx.quadraticCurveTo(640, 70, 790, 210);
    ctx.lineTo(790, 460);
    ctx.closePath();
    const winGrad = ctx.createLinearGradient(0, 100, 0, 460);
    winGrad.addColorStop(0, '#2c4885');
    winGrad.addColorStop(1, '#152244');
    ctx.fillStyle = winGrad;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#2d3359';
    ctx.stroke();

    // Lua e estrelas dentro da janela
    ctx.fillStyle = '#e6f0ff';
    ctx.beginPath();
    ctx.arc(680, 200, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#263d73';
    ctx.beginPath();
    ctx.arc(694, 192, 33, 0, Math.PI * 2);
    ctx.fill();

    // Grade da janela
    ctx.strokeStyle = '#202645';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(640, 130);
    ctx.lineTo(640, 460);
    ctx.moveTo(490, 290);
    ctx.lineTo(790, 290);
    ctx.stroke();
    ctx.restore();

    // Estantes laterais com livros e frascos
    const drawBookshelf = (startX) => {
      ctx.fillStyle = '#1b162e';
      ctx.fillRect(startX, 120, 250, 430);
      ctx.strokeStyle = '#362d59';
      ctx.lineWidth = 4;
      ctx.strokeRect(startX, 120, 250, 430);

      for (let row = 0; row < 4; row++) {
        const y = 210 + row * 95;
        ctx.fillStyle = '#2d244d';
        ctx.fillRect(startX + 10, y, 230, 10);

        for (let b = 0; b < 8; b++) {
          const bx = startX + 18 + b * 27;
          const bh = 52 + ((row * 7 + b * 13) % 24);
          ctx.fillStyle = ['#4c6ef5', '#7950f2', '#3bc9db', '#ae3ec9', '#5c7cfa'][(row + b) % 5];
          ctx.globalAlpha = 0.65;
          ctx.fillRect(bx, y - bh, 20, bh);
          ctx.globalAlpha = 1;
        }
      }
    };
    drawBookshelf(80);
    drawBookshelf(950);

    // Círculo rúnico brilhante no piso/fundo
    ctx.save();
    ctx.translate(640, 560);
    ctx.scale(1, 0.35);
    ctx.strokeStyle = 'rgba(122, 162, 255, 0.38)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 240, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 190, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Bancada / mesa arcana em primeiro plano
    const deskGrad = ctx.createLinearGradient(0, 540, 0, 720);
    deskGrad.addColorStop(0, '#2a2042');
    deskGrad.addColorStop(1, '#120d1f');
    ctx.fillStyle = deskGrad;
    ctx.fillRect(0, 550, 1280, 170);
    ctx.fillStyle = '#4c3b75';
    ctx.fillRect(0, 550, 1280, 6);

    return this._toTexture(canvas);
  }

  static _createAstralGardenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // Céu astral com nebulosa
    const skyGrad = ctx.createLinearGradient(0, 0, 1280, 720);
    skyGrad.addColorStop(0, '#090d24');
    skyGrad.addColorStop(0.5, '#1d1647');
    skyGrad.addColorStop(1, '#0b2239');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Nebulosa luminosa
    const neb = ctx.createRadialGradient(780, 220, 20, 780, 220, 420);
    neb.addColorStop(0, 'rgba(199, 146, 234, 0.45)');
    neb.addColorStop(0.5, 'rgba(86, 204, 242, 0.2)');
    neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, 1280, 720);

    // Estrelas
    for (let i = 0; i < 110; i++) {
      const sx = (i * 193) % 1280;
      const sy = (i * 97) % 460;
      const r = (i % 3) + 1;
      ctx.fillStyle = i % 4 === 0 ? '#a5f3fc' : '#ffffff';
      ctx.globalAlpha = 0.45 + (i % 5) * 0.1;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Montanhas cristalinas ao fundo
    ctx.fillStyle = '#151c3d';
    ctx.beginPath();
    ctx.moveTo(0, 520);
    ctx.lineTo(220, 340);
    ctx.lineTo(440, 490);
    ctx.lineTo(710, 310);
    ctx.lineTo(960, 480);
    ctx.lineTo(1180, 350);
    ctx.lineTo(1280, 460);
    ctx.lineTo(1280, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();

    // Lago refletivo e gramado astral
    const groundGrad = ctx.createLinearGradient(0, 500, 0, 720);
    groundGrad.addColorStop(0, '#102e4a');
    groundGrad.addColorStop(1, '#071424');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, 500, 1280, 220);

    // Cristais/árvores luminosas
    const drawCrystal = (cx, cy, h, color) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.lineTo(cx + h * 0.22, cy);
      ctx.lineTo(cx, cy + 16);
      ctx.lineTo(cx - h * 0.22, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawCrystal(170, 520, 170, '#5eead4');
    drawCrystal(230, 535, 115, '#7aa2ff');
    drawCrystal(1080, 525, 190, '#c792ea');
    drawCrystal(1020, 540, 120, '#5eead4');

    return this._toTexture(canvas);
  }

  static _createLyraTexture(expression = 'neutral') {
    const canvas = document.createElement('canvas');
    canvas.width = 460;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 460, 640);

    // Cabelo traseiro
    ctx.fillStyle = '#3b2d6b';
    ctx.beginPath();
    ctx.ellipse(230, 235, 96, 130, 0, 0, Math.PI * 2);
    ctx.fill();

    // Capa e vestido arcano
    const robeGrad = ctx.createLinearGradient(230, 270, 230, 640);
    robeGrad.addColorStop(0, '#364fc7');
    robeGrad.addColorStop(1, '#1b1f4a');
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(145, 315);
    ctx.quadraticCurveTo(230, 285, 315, 315);
    ctx.lineTo(355, 640);
    ctx.lineTo(105, 640);
    ctx.closePath();
    ctx.fill();

    // Detalhe dourado no colarinho
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(165, 320);
    ctx.quadraticCurveTo(230, 365, 295, 320);
    ctx.stroke();

    // Pingente brilhante
    ctx.fillStyle = '#74c0fc';
    ctx.beginPath();
    ctx.arc(230, 355, 11, 0, Math.PI * 2);
    ctx.fill();

    // Pescoço e rosto
    ctx.fillStyle = '#fce4d6';
    ctx.fillRect(212, 265, 36, 45);
    ctx.beginPath();
    ctx.ellipse(230, 210, 64, 76, 0, 0, Math.PI * 2);
    ctx.fill();

    // Franja e mechas laterais
    ctx.fillStyle = '#4c3a8a';
    ctx.beginPath();
    ctx.arc(230, 175, 72, Math.PI, 0);
    ctx.lineTo(295, 235);
    ctx.quadraticCurveTo(260, 185, 230, 200);
    ctx.quadraticCurveTo(200, 185, 165, 235);
    ctx.closePath();
    ctx.fill();

    // Olhos
    const drawEye = (ex) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, 212, 14, expression === 'surprised' ? 16 : 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4c6ef5';
      ctx.beginPath();
      ctx.arc(ex, 213, expression === 'surprised' ? 9 : 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#182147';
      ctx.beginPath();
      ctx.arc(ex, 213, 5, 0, Math.PI * 2);
      ctx.fill();

      // Brilho nos olhos
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 4, 208, 3, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEye(202);
    drawEye(258);

    // Sobrancelhas
    ctx.strokeStyle = '#3b2d6b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (expression === 'surprised') {
      ctx.moveTo(188, 188);
      ctx.quadraticCurveTo(202, 180, 216, 188);
      ctx.moveTo(244, 188);
      ctx.quadraticCurveTo(258, 180, 272, 188);
    } else {
      ctx.moveTo(188, 195);
      ctx.lineTo(216, 193);
      ctx.moveTo(244, 193);
      ctx.lineTo(272, 195);
    }
    ctx.stroke();

    // Boca
    ctx.strokeStyle = '#b86b6b';
    ctx.fillStyle = '#d97777';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (expression === 'surprised') {
      ctx.ellipse(230, 252, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(218, 250);
      ctx.quadraticCurveTo(230, 259, 242, 250);
      ctx.stroke();
    }

    return this._toTexture(canvas);
  }

  static _createCrystalOrbTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);

    // Halo externo suave
    const aura = ctx.createRadialGradient(128, 114, 20, 128, 114, 108);
    aura.addColorStop(0, 'rgba(116, 224, 255, 0.75)');
    aura.addColorStop(0.55, 'rgba(122, 162, 255, 0.25)');
    aura.addColorStop(1, 'rgba(122, 162, 255, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 256, 256);

    // Pedestal dourado
    ctx.fillStyle = '#d4a74a';
    ctx.beginPath();
    ctx.moveTo(86, 222);
    ctx.lineTo(170, 222);
    ctx.lineTo(154, 186);
    ctx.lineTo(102, 186);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffe082';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Esfera de cristal
    const orbGrad = ctx.createRadialGradient(108, 92, 10, 128, 116, 68);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.35, '#80e5ff');
    orbGrad.addColorStop(0.75, '#4c6ef5');
    orbGrad.addColorStop(1, '#2b2d7a');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(128, 116, 66, 0, Math.PI * 2);
    ctx.fill();

    // Reflexo especular
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.ellipse(104, 88, 18, 10, -0.55, 0, Math.PI * 2);
    ctx.fill();

    return this._toTexture(canvas);
  }
}
