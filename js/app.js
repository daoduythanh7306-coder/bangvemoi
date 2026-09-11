/* js/app.js - Entry point và state management */
'use strict';

/* ============================================================
   STATE
============================================================ */
const AppState = {
  pages: [],
  currentPageIndex: 0,
  brushColor: '#FFFFFF',
  brushSize: 4,

  init() {
    // Try load saved data
    const saved = Storage.load();
    if (saved.pages && saved.pages.length > 0) {
      this.pages = saved.pages;
      this.currentPageIndex = Math.min(saved.currentPage, this.pages.length - 1);
    } else {
      this.pages = [this.createPage()];
    }
    this.renderPagesList();
  },

  createPage() {
    return {
      id: Date.now(),
      background: 'blackboard',
      strokes: [],
      images: [],
      shapes: [],
      texts: [],
    };
  },

  currentPage() {
    return this.pages[this.currentPageIndex];
  },

  addPage() {
    this.pages.push(this.createPage());
    this.switchPage(this.pages.length - 1);
    this.renderPagesList();
    History.reset();
    showToast('Đã thêm trang mới!', 'info');
  },

  switchPage(index) {
    this.currentPageIndex = index;
    this.renderPagesList();
    CanvasManager.redrawAll();
    History.reset();
  },

  addStroke(stroke) {
    this.currentPage().strokes.push(stroke);
  },

  setBackground(bg) {
    this.currentPage().background = bg;
    CanvasManager.drawBackground();
    document.querySelectorAll('.bg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bg === bg);
    });
  },

  setTool(tool) {
    Tools.setTool(tool);
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  },

  setColor(color) {
    this.brushColor = color;
    document.querySelectorAll('.swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === color);
    });
  },

  save() {
    const ok = Storage.save(
      this.pages,
      this.currentPageIndex,
      { brushColor: this.brushColor, brushSize: this.brushSize }
    );
    showToast(ok ? 'Đã lưu!' : 'Lỗi lưu dữ liệu!', ok ? 'success' : 'error');
  },

  renderPagesList() {
    const list = document.getElementById('pages-list');
    list.innerHTML = '';
    this.pages.forEach((page, i) => {
      const el = document.createElement('div');
      el.className = 'page-thumb' + (i === this.currentPageIndex ? ' active' : '');
      el.innerHTML = `<div class="page-thumb-num">${i+1}</div><span>Trang ${i+1}</span>`;
      el.addEventListener('click', () => this.switchPage(i));
      list.appendChild(el);
    });
  },
};

/* ============================================================
   HISTORY (Undo/Redo)
============================================================ */
const History = {
  stack: [],
  pointer: -1,
  MAX: 50,

  push() {
    // Deep-clone current page strokes + shapes + texts
    const page = AppState.currentPage();
    const state = {
      strokes: JSON.parse(JSON.stringify(page.strokes)),
      shapes:  JSON.parse(JSON.stringify(page.shapes)),
      texts:   JSON.parse(JSON.stringify(page.texts)),
      images:  JSON.parse(JSON.stringify(page.images.map(img => {
        const { _element, ...rest } = img;
        return rest;
      }))),
    };
    // Truncate future
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(state);
    if (this.stack.length > this.MAX) this.stack.shift();
    this.pointer = this.stack.length - 1;
    this.updateButtons();
  },

  undo() {
    if (this.pointer <= 0) { showToast('Không còn gì để hoàn tác!', 'info'); return; }
    this.pointer--;
    this.restore();
  },

  redo() {
    if (this.pointer >= this.stack.length - 1) { showToast('Không còn gì để làm lại!', 'info'); return; }
    this.pointer++;
    this.restore();
  },

  restore() {
    const state = this.stack[this.pointer];
    if (!state) return;
    const page = AppState.currentPage();
    page.strokes = state.strokes;
    page.shapes  = state.shapes;
    page.texts   = state.texts;
    page.images  = state.images;
    CanvasManager.drawMain();
    this.updateButtons();
  },

  reset() {
    this.stack = [];
    this.pointer = -1;
    // Push initial empty state
    this.push();
  },

  updateButtons() {
    document.getElementById('btn-undo').style.opacity = this.pointer > 0 ? '1' : '0.4';
    document.getElementById('btn-redo').style.opacity = this.pointer < this.stack.length - 1 ? '1' : '0.4';
  },
};

/* ============================================================
   TOAST NOTIFICATIONS
============================================================ */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.textContent = (icons[type] || '') + ' ' + message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* ============================================================
   APP INIT
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Splash screen
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    splash.classList.add('hidden');
    setTimeout(() => {
      splash.style.display = 'none';
      document.getElementById('app').style.display = 'block';
      initApp();
    }, 500);
  }, 2000);
});

function initApp() {
  AppState.init();      // Phải init state TRƯỚC để pages có dữ liệu
  CanvasManager.init(); // Mới vẽ nền (cần AppState.currentPage())
  Tools.init();
  History.push(); // Initial state

  // ---- Brush Color ----
  document.querySelectorAll('.swatch[data-color]').forEach(swatch => {
    swatch.addEventListener('click', () => {
      AppState.setColor(swatch.dataset.color);
    });
  });

  document.getElementById('custom-color').addEventListener('input', (e) => {
    AppState.setColor(e.target.value);
  });

  // ---- Brush Size ----
  document.getElementById('brush-size').addEventListener('input', (e) => {
    document.getElementById('size-value').textContent = e.target.value;
    AppState.brushSize = parseFloat(e.target.value);
  });

  // ---- Opacity ----
  document.getElementById('brush-opacity').addEventListener('input', (e) => {
    document.getElementById('opacity-value').textContent = e.target.value;
  });

  // ---- Tool Buttons ----
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => AppState.setTool(btn.dataset.tool));
  });

  // Set default color to match blackboard (white chalk)
  AppState.setColor('#FFFFFF');

  // ---- Background ----
  document.querySelectorAll('.bg-btn[data-bg]').forEach(btn => {
    btn.addEventListener('click', () => AppState.setBackground(btn.dataset.bg));
  });

  // ---- Pages ----
  document.getElementById('btn-add-page').addEventListener('click', () => AppState.addPage());

  // ---- Undo/Redo ----
  document.getElementById('btn-undo').addEventListener('click', () => History.undo());
  document.getElementById('btn-redo').addEventListener('click', () => History.redo());

  // ---- Save ----
  document.getElementById('btn-save').addEventListener('click', () => AppState.save());

  // ---- Export ----
  const exportBtn = document.getElementById('btn-export');
  const exportMenu = document.getElementById('export-menu');
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => exportMenu.classList.remove('open'));

  document.getElementById('export-png').addEventListener('click', () => {
    exportMenu.classList.remove('open');
    Exporter.exportPNG();
  });
  document.getElementById('export-pdf').addEventListener('click', () => {
    exportMenu.classList.remove('open');
    Exporter.exportPDF();
  });

  // ---- Image Import ----
  document.getElementById('btn-import-image').addEventListener('click', () => {
    document.getElementById('file-image').click();
  });

  document.getElementById('file-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 600, maxH = 500;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        AppState.currentPage().images.push({
          id: Date.now(),
          src: ev.target.result,
          x: 50, y: 50, w, h,
          opacity: 1,
        });
        History.push();
        CanvasManager.drawMain();
        showToast('Đã chèn ảnh!', 'success');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // ---- PDF Import ----
  document.getElementById('btn-import-pdf').addEventListener('click', () => {
    document.getElementById('file-pdf').click();
  });

  document.getElementById('file-pdf').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await PDFImport.importPDF(file);
    e.target.value = '';
  });

  // ---- Zoom Controls ----
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    const rect = CanvasManager.uiCanvas.getBoundingClientRect();
    CanvasManager.zoom(1.2, CanvasManager.width/2, CanvasManager.height/2);
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    CanvasManager.zoom(0.8, CanvasManager.width/2, CanvasManager.height/2);
  });

  document.getElementById('btn-reset-view').addEventListener('click', () => {
    CanvasManager.resetView();
  });

  // ---- Initial tool ----
  AppState.setTool('pen');

  // ---- Auto-save every 2 minutes ----
  setInterval(() => AppState.save(), 120000);

  showToast('SmartBoard sẵn sàng! Phím tắt: P=Bút, E=Tẩy, H=Highlight, Space=Pan', 'info');
}
