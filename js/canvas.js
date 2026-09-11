/* js/canvas.js - Quản lý viewport, transform, và render chính */
'use strict';

const CanvasManager = {
  bgCtx: null,
  mainCtx: null,
  uiCtx: null,
  width: 0,
  height: 0,

  // Viewport transform
  vpX: 0, vpY: 0, scale: 1,
  MIN_SCALE: 0.1, MAX_SCALE: 8,

  init() {
    this.bgCanvas   = document.getElementById('bg-canvas');
    this.mainCanvas = document.getElementById('main-canvas');
    this.uiCanvas   = document.getElementById('ui-canvas');
    this.bgCtx   = this.bgCanvas.getContext('2d');
    this.mainCtx = this.mainCanvas.getContext('2d');
    this.uiCtx   = this.uiCanvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const container = document.getElementById('canvas-container');
    this.width  = container.clientWidth;
    this.height = container.clientHeight;
    [this.bgCanvas, this.mainCanvas, this.uiCanvas].forEach(c => {
      c.width  = this.width;
      c.height = this.height;
    });
    this.redrawAll();
  },

  // Chuyển tọa độ màn hình -> world
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.vpX) / this.scale,
      y: (sy - this.vpY) / this.scale,
    };
  },

  // Chuyển tọa độ world -> màn hình
  worldToScreen(wx, wy) {
    return {
      x: wx * this.scale + this.vpX,
      y: wy * this.scale + this.vpY,
    };
  },

  pan(dx, dy) {
    this.vpX += dx;
    this.vpY += dy;
    this.redrawAll();
  },

  zoom(factor, centerX, centerY) {
    const newScale = Math.min(this.MAX_SCALE, Math.max(this.MIN_SCALE, this.scale * factor));
    if (newScale === this.scale) return;
    // Zoom toward cursor position
    this.vpX = centerX - (centerX - this.vpX) * (newScale / this.scale);
    this.vpY = centerY - (centerY - this.vpY) * (newScale / this.scale);
    this.scale = newScale;
    this.redrawAll();
    document.getElementById('zoom-label').textContent = Math.round(this.scale * 100) + '%';
  },

  resetView() {
    this.vpX = 0; this.vpY = 0; this.scale = 1;
    this.redrawAll();
    document.getElementById('zoom-label').textContent = '100%';
  },

  // Full redraw của tất cả layers
  redrawAll() {
    this.drawBackground();
    this.drawMain();
  },

  drawBackground() {
    const page = AppState.currentPage();
    if (!page) return;
    Backgrounds.draw(
      this.bgCtx,
      page.background,
      this.vpX, this.vpY, this.scale,
      this.width, this.height
    );
  },

  drawMain() {
    const ctx = this.mainCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    const page = AppState.currentPage();
    if (!page) return;
    ctx.save();
    ctx.translate(this.vpX, this.vpY);
    ctx.scale(this.scale, this.scale);

    // Draw images
    page.images.forEach(img => this.drawImage(ctx, img));

    // Draw strokes
    page.strokes.forEach(stroke => this.drawStroke(ctx, stroke));

    // Draw shapes
    page.shapes.forEach(shape => Shapes.draw(ctx, shape));

    // Draw texts
    page.texts.forEach(t => this.drawText(ctx, t));

    ctx.restore();
  },

  drawStroke(ctx, stroke) {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = stroke.opacity || 1;
    ctx.strokeStyle = stroke.color || '#FFFFFF';
    ctx.lineWidth = stroke.size || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.type === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 15;
      ctx.lineCap = 'square';
    } else if (stroke.type === 'chalk') {
      ctx.globalAlpha = (stroke.opacity || 1) * 0.85;
    } else if (stroke.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.lineWidth = 15;
    }

    // Smooth stroke with quadratic curves
    ctx.beginPath();
    const pts = stroke.points;
    ctx.moveTo(pts[0], pts[1]);

    for (let i = 2; i < pts.length - 2; i += 2) {
      const mx = (pts[i] + pts[i+2]) / 2;
      const my = (pts[i+1] + pts[i+3]) / 2;
      ctx.quadraticCurveTo(pts[i], pts[i+1], mx, my);
    }

    // Last segment
    if (pts.length >= 4) {
      ctx.lineTo(pts[pts.length-2], pts[pts.length-1]);
    }

    ctx.stroke();
    ctx.restore();
  },

  drawImage(ctx, imgObj) {
    if (!imgObj._element) {
      const el = new Image();
      el.src = imgObj.src;
      imgObj._element = el;
      el.onload = () => this.drawMain();
    }
    if (imgObj._element.complete && imgObj._element.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = imgObj.opacity || 1;
      ctx.drawImage(imgObj._element, imgObj.x, imgObj.y, imgObj.w, imgObj.h);
      ctx.restore();
    }
  },

  drawText(ctx, t) {
    ctx.save();
    ctx.fillStyle = t.color || '#FFFFFF';
    ctx.font = `${t.size || 18}px Inter, sans-serif`;
    ctx.globalAlpha = t.opacity || 1;
    // Multi-line
    const lines = t.text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, t.x, t.y + i * (t.size || 18) * 1.4);
    });
    ctx.restore();
  },

  clearUI() {
    this.uiCtx.clearRect(0, 0, this.width, this.height);
  },

  // Vẽ stroke đang active lên UI canvas (realtime)
  drawActiveStroke(points, tool, color, size, opacity) {
    const ctx = this.uiCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (!points || points.length < 2) return;

    ctx.save();
    ctx.translate(this.vpX, this.vpY);
    ctx.scale(this.scale, this.scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = opacity;

    if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.4;
      ctx.lineCap = 'square';
    } else if (tool === 'eraser') {
      ctx.strokeStyle = 'rgba(100,100,100,0.5)';
      ctx.globalAlpha = 0.5;
    }

    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length - 2; i += 2) {
      const mx = (points[i] + points[i+2]) / 2;
      const my = (points[i+1] + points[i+3]) / 2;
      ctx.quadraticCurveTo(points[i], points[i+1], mx, my);
    }
    if (points.length >= 4) {
      ctx.lineTo(points[points.length-2], points[points.length-1]);
    }
    ctx.stroke();
    ctx.restore();
  },

  // Vẽ shape preview lên UI canvas
  drawShapePreview(shape) {
    const ctx = this.uiCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(this.vpX, this.vpY);
    ctx.scale(this.scale, this.scale);
    Shapes.draw(ctx, shape);
    ctx.restore();
  },

  // Vẽ ruler overlay
  drawRuler(x1, y1, x2, y2) {
    const ctx = this.uiCtx;
    ctx.save();
    ctx.translate(this.vpX, this.vpY);
    ctx.scale(this.scale, this.scale);

    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);

    // Ruler body
    ctx.fillStyle = 'rgba(255, 220, 100, 0.15)';
    ctx.strokeStyle = 'rgba(255,220,100,0.8)';
    ctx.lineWidth = 1;
    ctx.fillRect(0, -12, len, 24);
    ctx.strokeRect(0, -12, len, 24);

    // Tick marks
    const tickStep = 20;
    ctx.strokeStyle = 'rgba(255,220,100,0.7)';
    ctx.fillStyle = 'rgba(255,220,100,0.9)';
    ctx.font = `${8 / this.scale * 20}px Inter`;
    ctx.textAlign = 'center';
    for (let i = 0; i <= len; i += tickStep) {
      const isMajor = i % 100 === 0;
      ctx.lineWidth = isMajor ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(i, isMajor ? -8 : -4);
      ctx.lineTo(i, isMajor ? 8 : 4);
      ctx.stroke();
    }

    // Length label
    ctx.fillStyle = 'rgba(255,220,100,0.9)';
    ctx.font = `${Math.max(8, 11 / this.scale)}px Inter`;
    ctx.fillText(`${len.toFixed(0)}px`, len/2, -15);

    ctx.restore();
    ctx.restore();
  },

  // Vẽ protractor overlay
  drawProtractor(cx, cy, r) {
    const ctx = this.uiCtx;
    ctx.save();
    ctx.translate(this.vpX, this.vpY);
    ctx.scale(this.scale, this.scale);

    ctx.strokeStyle = 'rgba(100,220,255,0.8)';
    ctx.fillStyle = 'rgba(100,220,255,0.08)';
    ctx.lineWidth = 1.5;

    // Semicircle
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.lineTo(cx - r, cy);
    ctx.fill();
    ctx.stroke();

    // Angle marks
    ctx.fillStyle = 'rgba(100,220,255,0.9)';
    ctx.font = `${Math.max(8, 10 / this.scale)}px Inter`;
    ctx.textAlign = 'center';

    for (let deg = 0; deg <= 180; deg += 10) {
      const rad = (Math.PI - deg * Math.PI / 180);
      const isMajor = deg % 30 === 0;
      const tickLen = isMajor ? r * 0.15 : r * 0.08;
      const x1 = cx + Math.cos(rad) * r;
      const y1 = cy - Math.sin(rad) * r;
      const x2 = cx + Math.cos(rad) * (r - tickLen);
      const y2 = cy - Math.sin(rad) * (r - tickLen);

      ctx.strokeStyle = isMajor ? 'rgba(100,220,255,0.9)' : 'rgba(100,220,255,0.5)';
      ctx.lineWidth = isMajor ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (isMajor) {
        const lx = cx + Math.cos(rad) * (r - tickLen - 12);
        const ly = cy - Math.sin(rad) * (r - tickLen - 12);
        ctx.fillText(deg + '°', lx, ly);
      }
    }

    // Center point
    ctx.fillStyle = 'rgba(100,220,255,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }
};
