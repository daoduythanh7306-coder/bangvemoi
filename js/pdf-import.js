/* js/pdf-import.js - Import và render PDF */
'use strict';

const PDFImport = {
  async importPDF(file) {
    if (typeof pdfjsLib === 'undefined') {
      showToast('PDF.js chưa tải xong, thử lại!', 'error');
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    showToast('Đang tải PDF...', 'info');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const totalPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pdfPage = await pdf.getPage(pageNum);
        const viewport = pdfPage.getViewport({ scale: 2 });

        // Render page to offscreen canvas
        const offCanvas = document.createElement('canvas');
        offCanvas.width  = viewport.width;
        offCanvas.height = viewport.height;
        const offCtx = offCanvas.getContext('2d');

        await pdfPage.render({
          canvasContext: offCtx,
          viewport,
        }).promise;

        const dataURL = offCanvas.toDataURL('image/png');

        // Add as image to current page (or new pages)
        const page = AppState.currentPage();
        page.images.push({
          id: Date.now() + pageNum,
          src: dataURL,
          x: 20,
          y: 20 + (pageNum - 1) * (viewport.height / 2 + 30),
          w: viewport.width / 2,
          h: viewport.height / 2,
          opacity: 1,
        });
      }

      CanvasManager.drawMain();
      showToast(`Đã nhập ${totalPages} trang PDF!`, 'success');
    } catch (e) {
      console.error('PDF import error:', e);
      showToast('Lỗi khi nhập PDF: ' + e.message, 'error');
    }
  },
};
