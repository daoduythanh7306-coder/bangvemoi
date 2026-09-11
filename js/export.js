/* js/export.js - Xuất PNG và PDF */
'use strict';

const Exporter = {
  exportPNG() {
    const cm = CanvasManager;
    // Merge bg + main canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width  = cm.width;
    offCanvas.height = cm.height;
    const offCtx = offCanvas.getContext('2d');

    // Draw bg
    offCtx.drawImage(cm.bgCanvas, 0, 0);
    // Draw main content
    offCtx.drawImage(cm.mainCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = `smartboard_${Date.now()}.png`;
    link.href = offCanvas.toDataURL('image/png');
    link.click();
    showToast('Đã xuất file PNG!', 'success');
  },

  exportPDF() {
    const cm = CanvasManager;
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      showToast('jsPDF chưa tải, thử lại sau!', 'error');
      return;
    }

    // Merge canvases
    const offCanvas = document.createElement('canvas');
    offCanvas.width  = cm.width;
    offCanvas.height = cm.height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(cm.bgCanvas, 0, 0);
    offCtx.drawImage(cm.mainCanvas, 0, 0);

    const imgData = offCanvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: cm.width > cm.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [cm.width, cm.height],
      hotfixes: ['px_scaling'],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, cm.width, cm.height);
    pdf.save(`smartboard_${Date.now()}.pdf`);
    showToast('Đã xuất file PDF!', 'success');
  },
};
