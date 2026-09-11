/* js/shapes.js - Vẽ các hình học */
'use strict';

const Shapes = {
  draw(ctx, shape) {
    if (!shape) return;
    ctx.save();
    ctx.strokeStyle = shape.color || '#FFFFFF';
    ctx.fillStyle = shape.fill || 'transparent';
    ctx.lineWidth = shape.size || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = shape.opacity || 1;

    if (shape.fill && shape.fill !== 'transparent' && shape.fill !== 'none') {
      ctx.fillStyle = shape.fill;
    }

    const hasFill = shape.fill && shape.fill !== 'transparent' && shape.fill !== 'none';

    switch (shape.type) {
      case 'line':
        this.drawLine(ctx, shape); break;
      case 'arrow':
        this.drawArrow(ctx, shape); break;
      case 'rect':
        this.drawRect(ctx, shape, hasFill); break;
      case 'circle':
        this.drawCircle(ctx, shape, hasFill); break;
      case 'triangle':
        this.drawTriangle(ctx, shape, hasFill); break;
    }

    ctx.restore();
  },

  drawLine(ctx, s) {
    if (s.dashed) {
      ctx.setLineDash([8, 4]);
    }
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  drawArrow(ctx, s) {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 2) return;

    const angle = Math.atan2(dy, dx);
    const headLen = Math.min(20, len * 0.3) + s.size * 2;

    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(s.x2, s.y2);
    ctx.lineTo(
      s.x2 - headLen * Math.cos(angle - Math.PI/6),
      s.y2 - headLen * Math.sin(angle - Math.PI/6)
    );
    ctx.moveTo(s.x2, s.y2);
    ctx.lineTo(
      s.x2 - headLen * Math.cos(angle + Math.PI/6),
      s.y2 - headLen * Math.sin(angle + Math.PI/6)
    );
    ctx.stroke();
  },

  drawRect(ctx, s, hasFill) {
    const x = Math.min(s.x1, s.x2);
    const y = Math.min(s.y1, s.y2);
    const w = Math.abs(s.x2 - s.x1);
    const h = Math.abs(s.y2 - s.y1);
    if (hasFill) { ctx.fillStyle = s.fill; ctx.fillRect(x, y, w, h); }
    ctx.strokeRect(x, y, w, h);
  },

  drawCircle(ctx, s, hasFill) {
    const cx = (s.x1 + s.x2) / 2;
    const cy = (s.y1 + s.y2) / 2;
    const rx = Math.abs(s.x2 - s.x1) / 2;
    const ry = Math.abs(s.y2 - s.y1) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (hasFill) { ctx.fillStyle = s.fill; ctx.fill(); }
    ctx.stroke();
  },

  drawTriangle(ctx, s, hasFill) {
    const x1 = (s.x1 + s.x2) / 2;
    const y1 = s.y1;
    const x2 = s.x1;
    const y2 = s.y2;
    const x3 = s.x2;
    const y3 = s.y2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    if (hasFill) { ctx.fillStyle = s.fill; ctx.fill(); }
    ctx.stroke();
  },
};
