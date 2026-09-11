/* js/tools.js - Xử lý tất cả công cụ vẽ và tương tác */
'use strict';

const Tools = {
  currentTool: 'pen',
  isDrawing: false,
  currentPoints: [],
  startX: 0, startY: 0,
  isPanning: false,
  panStartX: 0, panStartY: 0,
  panStartVpX: 0, panStartVpY: 0,
  spaceHeld: false,

  // For selection tool
  selectedImage: null,
  dragOffX: 0, dragOffY: 0,

  // For ruler/protractor
  rulerStartX: 0, rulerStartY: 0,
  rulerActive: false,
  protractorX: 0, protractorY: 0,
  protractorR: 100,

  init() {
    const ui = CanvasManager.uiCanvas;

    // Pointer events for stylus pressure support
    ui.addEventListener('pointerdown',  e => this.onPointerDown(e), { passive: false });
    ui.addEventListener('pointermove',  e => this.onPointerMove(e), { passive: false });
    ui.addEventListener('pointerup',    e => this.onPointerUp(e));
    ui.addEventListener('pointercancel',e => this.onPointerUp(e));

    // Wheel for zoom
    ui.addEventListener('wheel', e => this.onWheel(e), { passive: false });

    // Space for pan
    document.addEventListener('keydown', e => this.onKeyDown(e));
    document.addEventListener('keyup',   e => this.onKeyUp(e));

    // Touch zoom (two-finger)
    this.lastTouchDist = null;
    ui.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        this.lastTouchDist = this.getTouchDist(e.touches);
        e.preventDefault();
      }
    }, { passive: false });
    ui.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const dist = this.getTouchDist(e.touches);
        if (this.lastTouchDist) {
          const factor = dist / this.lastTouchDist;
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rect = CanvasManager.uiCanvas.getBoundingClientRect();
          CanvasManager.zoom(factor, cx - rect.left, cy - rect.top);
        }
        this.lastTouchDist = dist;
        e.preventDefault();
      }
    }, { passive: false });
    ui.addEventListener('touchend', () => { this.lastTouchDist = null; });
  },

  getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  },

  setTool(tool) {
    this.currentTool = tool;
    const container = document.getElementById('canvas-container');
    container.className = '';
    if (tool === 'pan') container.classList.add('cursor-pan');
    else if (tool === 'eraser') container.classList.add('cursor-eraser');
    else if (tool === 'select') container.classList.add('cursor-select');
    else if (tool === 'text') container.classList.add('cursor-text');
    else container.classList.add('cursor-pen');

    // Update status
    const names = {
      pen: 'Bút vẽ', chalk: 'Phấn', highlighter: 'Bút Highlight',
      eraser: 'Tẩy', line: 'Đường thẳng', arrow: 'Mũi tên',
      rect: 'Hình chữ nhật', circle: 'Hình tròn', triangle: 'Tam giác',
      text: 'Văn bản', select: 'Chọn', pan: 'Di chuyển',
      ruler: 'Thước kẻ', protractor: 'Thước đo góc',
    };
    document.getElementById('status-tool').textContent = 'Công cụ: ' + (names[tool] || tool);
  },

  getPos(e) {
    const rect = CanvasManager.uiCanvas.getBoundingClientRect();
    return {
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
    };
  },

  onPointerDown(e) {
    e.preventDefault();
    CanvasManager.uiCanvas.setPointerCapture(e.pointerId);

    const { sx, sy } = this.getPos(e);
    const world = CanvasManager.screenToWorld(sx, sy);

    // Pan mode
    if (this.spaceHeld || this.currentTool === 'pan') {
      this.isPanning = true;
      this.panStartX = sx; this.panStartY = sy;
      this.panStartVpX = CanvasManager.vpX;
      this.panStartVpY = CanvasManager.vpY;
      document.getElementById('canvas-container').classList.add('dragging');
      return;
    }

    // Middle mouse button = pan
    if (e.button === 1) {
      this.isPanning = true;
      this.panStartX = sx; this.panStartY = sy;
      this.panStartVpX = CanvasManager.vpX;
      this.panStartVpY = CanvasManager.vpY;
      return;
    }

    this.startX = world.x;
    this.startY = world.y;

    switch (this.currentTool) {
      case 'pen':
      case 'chalk':
      case 'highlighter':
      case 'eraser':
        this.isDrawing = true;
        this.currentPoints = [world.x, world.y];
        break;

      case 'line':
      case 'arrow':
      case 'rect':
      case 'circle':
      case 'triangle':
        this.isDrawing = true;
        break;

      case 'ruler':
        this.rulerActive = true;
        this.rulerStartX = world.x;
        this.rulerStartY = world.y;
        break;

      case 'protractor':
        this.protractorX = world.x;
        this.protractorY = world.y;
        this.protractorR = 100;
        CanvasManager.drawProtractor(world.x, world.y, 100);
        break;

      case 'text':
        this.placeTextInput(sx, sy, world.x, world.y);
        break;

      case 'select':
        this.trySelectImage(world.x, world.y, sx, sy);
        break;
    }
  },

  onPointerMove(e) {
    e.preventDefault();
    const { sx, sy } = this.getPos(e);
    const world = CanvasManager.screenToWorld(sx, sy);

    // Update coords display
    document.getElementById('status-coords').textContent =
      `x: ${Math.round(world.x)}, y: ${Math.round(world.y)}`;

    // Pan
    if (this.isPanning) {
      CanvasManager.vpX = this.panStartVpX + (sx - this.panStartX);
      CanvasManager.vpY = this.panStartVpY + (sy - this.panStartY);
      CanvasManager.redrawAll();
      return;
    }

    // Pressure sensitivity for stylus
    const pressure = e.pressure > 0 ? e.pressure : 1;
    const baseSz = parseFloat(document.getElementById('brush-size').value);
    const effectiveSize = e.pointerType === 'pen' ? baseSz * (0.5 + pressure * 0.8) : baseSz;

    const color   = AppState.brushColor;
    const opacity = parseFloat(document.getElementById('brush-opacity').value) / 100;

    if (!this.isDrawing) {
      // Show ruler
      if (this.currentTool === 'ruler' && this.rulerActive) {
        CanvasManager.clearUI();
        CanvasManager.drawRuler(this.rulerStartX, this.rulerStartY, world.x, world.y);
      }
      // Protractor drag to resize
      if (this.currentTool === 'protractor') {
        const dx = world.x - this.protractorX;
        const dy = world.y - this.protractorY;
        this.protractorR = Math.max(30, Math.sqrt(dx*dx+dy*dy));
        CanvasManager.clearUI();
        CanvasManager.drawProtractor(this.protractorX, this.protractorY, this.protractorR);
      }
      return;
    }

    switch (this.currentTool) {
      case 'pen':
      case 'chalk':
      case 'highlighter':
      case 'eraser':
        this.currentPoints.push(world.x, world.y);
        CanvasManager.drawActiveStroke(
          this.currentPoints,
          this.currentTool,
          color,
          effectiveSize,
          opacity
        );
        // Auto-scroll: expand canvas if near edges
        this.checkAutoScroll(sx, sy);
        break;

      case 'line':
      case 'arrow':
      case 'rect':
      case 'circle':
      case 'triangle': {
        const snap = e.shiftKey;
        let x2 = world.x, y2 = world.y;
        if (snap && (this.currentTool === 'line' || this.currentTool === 'arrow')) {
          // Snap to 45° angles
          const dx = world.x - this.startX;
          const dy = world.y - this.startY;
          const angle = Math.atan2(dy, dx);
          const snapped = Math.round(angle / (Math.PI/4)) * (Math.PI/4);
          const len = Math.sqrt(dx*dx + dy*dy);
          x2 = this.startX + Math.cos(snapped) * len;
          y2 = this.startY + Math.sin(snapped) * len;
        }
        if (snap && (this.currentTool === 'rect' || this.currentTool === 'circle')) {
          // Perfect square/circle
          const dx = world.x - this.startX;
          const s = Math.sign(dx);
          const sz = Math.abs(dx);
          y2 = this.startY + s * sz;
        }
        CanvasManager.drawShapePreview({
          type: this.currentTool,
          x1: this.startX, y1: this.startY,
          x2, y2,
          color, size: baseSz,
          opacity, fill: 'none',
        });
        break;
      }

      case 'select':
        this.dragSelectedImage(world.x, world.y);
        break;
    }
  },

  onPointerUp(e) {
    document.getElementById('canvas-container').classList.remove('dragging');

    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (!this.isDrawing) {
      if (this.currentTool === 'ruler' && this.rulerActive) {
        this.rulerActive = false;
        // Ruler stays on UI canvas as reference until next action
      }
      return;
    }

    const { sx, sy } = this.getPos(e);
    const world = CanvasManager.screenToWorld(sx, sy);
    const color   = AppState.brushColor;
    const opacity = parseFloat(document.getElementById('brush-opacity').value) / 100;
    const size    = parseFloat(document.getElementById('brush-size').value);

    const pressure = e.pressure > 0 ? e.pressure : 1;
    const effectiveSize = e.pointerType === 'pen' ? size * (0.5 + pressure * 0.8) : size;

    switch (this.currentTool) {
      case 'pen':
      case 'chalk':
      case 'highlighter':
      case 'eraser':
        if (this.currentPoints.length >= 2) {
          // Single dot
          if (this.currentPoints.length === 2) {
            this.currentPoints.push(
              this.currentPoints[0] + 0.1,
              this.currentPoints[1] + 0.1
            );
          }
          const stroke = {
            id: Date.now(),
            type: this.currentTool,
            color, opacity,
            size: effectiveSize,
            points: [...this.currentPoints],
          };
          AppState.addStroke(stroke);
          History.push();
        }
        break;

      case 'line':
      case 'arrow':
      case 'rect':
      case 'circle':
      case 'triangle': {
        let x2 = world.x, y2 = world.y;
        if (e.shiftKey && (this.currentTool === 'line' || this.currentTool === 'arrow')) {
          const dx = world.x - this.startX;
          const dy = world.y - this.startY;
          const angle = Math.atan2(dy, dx);
          const snapped = Math.round(angle / (Math.PI/4)) * (Math.PI/4);
          const len = Math.sqrt(dx*dx + dy*dy);
          x2 = this.startX + Math.cos(snapped) * len;
          y2 = this.startY + Math.sin(snapped) * len;
        }
        if (e.shiftKey && (this.currentTool === 'rect' || this.currentTool === 'circle')) {
          const dx = world.x - this.startX;
          const s = Math.sign(dx);
          const sz = Math.abs(dx);
          y2 = this.startY + s * sz;
        }
        const shape = {
          id: Date.now(),
          type: this.currentTool,
          x1: this.startX, y1: this.startY,
          x2, y2,
          color, size, opacity, fill: 'none',
        };
        AppState.currentPage().shapes.push(shape);
        History.push();
        break;
      }

      case 'select':
        this.selectedImage = null;
        break;
    }

    this.isDrawing = false;
    this.currentPoints = [];
    CanvasManager.clearUI();
    CanvasManager.drawMain();
  },

  onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const rect = CanvasManager.uiCanvas.getBoundingClientRect();
      CanvasManager.zoom(factor, e.clientX - rect.left, e.clientY - rect.top);
    } else {
      // Pan
      CanvasManager.pan(-e.deltaX, -e.deltaY);
    }
  },

  onKeyDown(e) {
    if (e.code === 'Space' && !e.target.closest('textarea, input')) {
      e.preventDefault();
      this.spaceHeld = true;
      document.getElementById('canvas-container').classList.add('cursor-pan');
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); History.undo(); }
      if (e.key === 'y' || (e.shiftKey && e.key === 'z')) { e.preventDefault(); History.redo(); }
      if (e.key === 's') { e.preventDefault(); AppState.save(); }
    }
    // Shortcut keys
    const shortcuts = {
      'i': 'pen', 'c': 'chalk', 'h': 'highlighter', 'e': 'eraser',
      'l': 'line', 'a': 'arrow', 'r': 'rect', 'o': 'circle',
      't': 'text', 's': 'select', 'm': 'pan',
    };
    if (!e.ctrlKey && !e.metaKey && !e.target.closest('textarea, input')) {
      const tool = shortcuts[e.key.toLowerCase()];
      if (tool) { AppState.setTool(tool); }
    }
  },

  onKeyUp(e) {
    if (e.code === 'Space') {
      this.spaceHeld = false;
      if (this.currentTool !== 'pan') {
        const container = document.getElementById('canvas-container');
        container.classList.remove('cursor-pan');
      }
    }
  },

  checkAutoScroll(sx, sy) {
    const margin = 60;
    const step = 12;
    const cw = CanvasManager.width;
    const ch = CanvasManager.height;
    if (sx > cw - margin) CanvasManager.pan(-step, 0);
    if (sx < margin)       CanvasManager.pan(step, 0);
    if (sy > ch - margin)  CanvasManager.pan(0, -step);
    if (sy < margin)       CanvasManager.pan(0, step);
  },

  placeTextInput(sx, sy, wx, wy) {
    const inp = document.getElementById('text-input');
    inp.style.display = 'block';
    inp.style.left = sx + 'px';
    inp.style.top  = sy + 'px';
    inp.style.fontSize = (AppState.brushSize || 18) + 'px';
    inp.style.color = AppState.brushColor || '#FFFFFF';
    inp.value = '';
    inp.focus();

    const commit = () => {
      const txt = inp.value.trim();
      if (txt) {
        AppState.currentPage().texts.push({
          id: Date.now(),
          text: txt,
          x: wx, y: wy,
          color: AppState.brushColor,
          size: parseFloat(document.getElementById('brush-size').value) * 3 + 10,
          opacity: parseFloat(document.getElementById('brush-opacity').value) / 100,
        });
        History.push();
        CanvasManager.drawMain();
      }
      inp.style.display = 'none';
      inp.removeEventListener('blur', commit);
      inp.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { inp.style.display = 'none'; return; }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
    };

    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', onKeyDown);
  },

  trySelectImage(wx, wy, sx, sy) {
    const images = AppState.currentPage().images;
    // Hit test in reverse order (top image first)
    for (let i = images.length - 1; i >= 0; i--) {
      const img = images[i];
      if (wx >= img.x && wx <= img.x + img.w &&
          wy >= img.y && wy <= img.y + img.h) {
        this.selectedImage = img;
        this.dragOffX = wx - img.x;
        this.dragOffY = wy - img.y;
        return;
      }
    }
    this.selectedImage = null;
  },

  dragSelectedImage(wx, wy) {
    if (!this.selectedImage) return;
    this.selectedImage.x = wx - this.dragOffX;
    this.selectedImage.y = wy - this.dragOffY;
    CanvasManager.drawMain();
  },
};
