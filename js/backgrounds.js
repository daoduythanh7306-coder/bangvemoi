/* js/backgrounds.js - Vẽ các loại nền */
'use strict';

const Backgrounds = {
  /**
   * Vẽ nền lên bgCanvas theo viewport transform
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} type
   * @param {number} vpX - viewport offset X
   * @param {number} vpY - viewport offset Y
   * @param {number} scale
   * @param {number} cw - canvas width
   * @param {number} ch - canvas height
   */
  draw(ctx, type, vpX, vpY, scale, cw, ch) {
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);

    switch (type) {
      case 'blackboard':   this.blackboard(ctx, vpX, vpY, scale, cw, ch); break;
      case 'whiteboard':   this.whiteboard(ctx, vpX, vpY, scale, cw, ch); break;
      case 'lined':        this.lined(ctx, vpX, vpY, scale, cw, ch); break;
      case 'grid':         this.grid(ctx, vpX, vpY, scale, cw, ch); break;
      case 'dots':         this.dots(ctx, vpX, vpY, scale, cw, ch); break;
      case 'music':        this.music(ctx, vpX, vpY, scale, cw, ch); break;
      case 'isometric':    this.isometric(ctx, vpX, vpY, scale, cw, ch); break;
      default:             this.blackboard(ctx, vpX, vpY, scale, cw, ch);
    }

    ctx.restore();
  },

  blackboard(ctx, vpX, vpY, scale, cw, ch) {
    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, '#2D4A3E');
    grad.addColorStop(0.5, '#1F3529');
    grad.addColorStop(1, '#1A2E24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
    // Subtle texture
    ctx.fillStyle = 'rgba(255,255,255,0.008)';
    for (let i = 0; i < cw; i += 3) {
      for (let j = 0; j < ch; j += 3) {
        if (Math.random() < 0.3) ctx.fillRect(i, j, 1, 1);
      }
    }
  },

  whiteboard(ctx, vpX, vpY, scale, cw, ch) {
    ctx.fillStyle = '#F8F9FA';
    ctx.fillRect(0, 0, cw, ch);
    // Subtle shadow on edges
    const shadow = ctx.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, Math.max(cw,ch)/1.5);
    shadow.addColorStop(0, 'rgba(0,0,0,0)');
    shadow.addColorStop(1, 'rgba(0,0,0,0.04)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, cw, ch);
  },

  lined(ctx, vpX, vpY, scale, cw, ch) {
    ctx.fillStyle = '#FEFEFE';
    ctx.fillRect(0, 0, cw, ch);

    const spacing = 32 * scale;
    const offsetY = ((vpY % spacing) + spacing) % spacing;

    ctx.strokeStyle = 'rgba(100, 149, 237, 0.35)';
    ctx.lineWidth = 1;

    for (let y = offsetY - spacing; y < ch + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // Red margin line
    const marginX = 60 * scale - (vpX % (cw + 1));
    ctx.strokeStyle = 'rgba(255, 120, 100, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, 0);
    ctx.lineTo(marginX, ch);
    ctx.stroke();
  },

  grid(ctx, vpX, vpY, scale, cw, ch) {
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, cw, ch);

    const spacing = 24 * scale;
    const offsetX = ((vpX % spacing) + spacing) % spacing;
    const offsetY = ((vpY % spacing) + spacing) % spacing;

    // Minor gridlines
    ctx.strokeStyle = 'rgba(160,180,210,0.3)';
    ctx.lineWidth = 0.5;

    for (let x = offsetX - spacing; x < cw + spacing; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = offsetY - spacing; y < ch + spacing; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // Major gridlines every 5
    const majorSpacing = spacing * 5;
    const majorOffsetX = ((vpX % majorSpacing) + majorSpacing) % majorSpacing;
    const majorOffsetY = ((vpY % majorSpacing) + majorSpacing) % majorSpacing;

    ctx.strokeStyle = 'rgba(120,150,190,0.45)';
    ctx.lineWidth = 1;

    for (let x = majorOffsetX - majorSpacing; x < cw + majorSpacing; x += majorSpacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = majorOffsetY - majorSpacing; y < ch + majorSpacing; y += majorSpacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }
  },

  dots(ctx, vpX, vpY, scale, cw, ch) {
    const grad = ctx.createLinearGradient(0,0,cw,ch);
    grad.addColorStop(0, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    const spacing = 28 * scale;
    const offsetX = ((vpX % spacing) + spacing) % spacing;
    const offsetY = ((vpY % spacing) + spacing) % spacing;
    const r = Math.max(1, 1.5 * scale);

    ctx.fillStyle = 'rgba(180,190,220,0.5)';
    for (let x = offsetX - spacing; x < cw + spacing; x += spacing) {
      for (let y = offsetY - spacing; y < ch + spacing; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
      }
    }
  },

  music(ctx, vpX, vpY, scale, cw, ch) {
    ctx.fillStyle = '#FEFEFE';
    ctx.fillRect(0, 0, cw, ch);

    // Music staff: 5 lines per staff, with spacing
    const lineSpacing = 8 * scale;
    const staffSpacing = 60 * scale;
    const offsetY = ((vpY % staffSpacing) + staffSpacing) % staffSpacing;

    ctx.strokeStyle = 'rgba(180, 80, 80, 0.6)';
    ctx.lineWidth = 0.8 * scale;

    for (let staffY = offsetY - staffSpacing; staffY < ch + staffSpacing; staffY += staffSpacing) {
      for (let line = 0; line < 5; line++) {
        const y = staffY + line * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }
    }
  },

  isometric(ctx, vpX, vpY, scale, cw, ch) {
    ctx.fillStyle = '#F0F4F8';
    ctx.fillRect(0, 0, cw, ch);

    const spacing = 20 * scale;
    const h = spacing * Math.sqrt(3) / 2;

    ctx.strokeStyle = 'rgba(120, 150, 180, 0.4)';
    ctx.lineWidth = 0.5;

    // Horizontal lines
    const offY = ((vpY % h) + h) % h;
    for (let y = offY - h; y < ch + h; y += h) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // 60° lines
    const diagSpacing = spacing;
    const diagOffX = ((vpX % diagSpacing) + diagSpacing) % diagSpacing;

    for (let x = diagOffX - diagSpacing - ch * 2; x < cw + ch * 2; x += diagSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + ch * Math.tan(Math.PI/6), ch);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - ch * Math.tan(Math.PI/6), ch);
      ctx.stroke();
    }
  }
};
