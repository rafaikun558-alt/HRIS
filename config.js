// ============================================================
// HRIS GITHUB MIGRATION - FRONTEND CONFIG
// ============================================================
// Isi API_BASE_URL dengan domain Cloudflare Worker yang menjadi
// proxy ke Google Apps Script Web App.
// Contoh: https://hris-api.example.workers.dev/api
//
// APP_BASE_URL adalah alamat frontend GitHub Pages / Cloudflare Pages.
// Contoh: https://username.github.io/hris-metalindo
// atau https://hr.metalindo.com

window.HRIS_CONFIG = {
  API_BASE_URL: "https://GANTI-DENGAN-URL-WORKER/api",
  APP_BASE_URL: "https://GANTI-DENGAN-URL-FRONTEND"
};
