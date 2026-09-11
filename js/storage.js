/* js/storage.js - Lưu trữ dữ liệu với LocalStorage */
'use strict';

const Storage = {
  KEYS: {
    PAGES: 'smartboard_pages',
    CURRENT_PAGE: 'smartboard_current_page',
    SETTINGS: 'smartboard_settings',
  },

  save(pages, currentPage, settings) {
    try {
      // Lưu pages data (serialize strokes)
      const pagesData = pages.map(p => ({
        id: p.id,
        background: p.background,
        strokes: p.strokes.map(s => ({
          ...s,
          points: Array.from(s.points),
        })),
        images: p.images,
        shapes: p.shapes,
        texts: p.texts,
      }));
      localStorage.setItem(this.KEYS.PAGES, JSON.stringify(pagesData));
      localStorage.setItem(this.KEYS.CURRENT_PAGE, currentPage);
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.warn('Storage save failed:', e);
      return false;
    }
  },

  load() {
    try {
      const pagesRaw = localStorage.getItem(this.KEYS.PAGES);
      const currentPage = parseInt(localStorage.getItem(this.KEYS.CURRENT_PAGE)) || 0;
      const settingsRaw = localStorage.getItem(this.KEYS.SETTINGS);
      return {
        pages: pagesRaw ? JSON.parse(pagesRaw) : null,
        currentPage,
        settings: settingsRaw ? JSON.parse(settingsRaw) : null,
      };
    } catch (e) {
      return { pages: null, currentPage: 0, settings: null };
    }
  },

  clear() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  }
};
