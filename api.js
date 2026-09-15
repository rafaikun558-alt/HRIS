/*
 * ============================================================
 * HRIS GITHUB MIGRATION - API COMPATIBILITY SHIM
 * ============================================================
 * Tujuan: mempertahankan pola pemanggilan frontend lama:
 *
 *   google.script.run
 *     .withSuccessHandler(...)
 *     .withFailureHandler(...)
 *     .namaFungsi(arg1, arg2);
 *
 * tanpa google.script.run dari Apps Script HTML Service.
 * Business logic tetap di Code.gs.
 */
(function () {
  "use strict";

  if (!window.HRIS_CONFIG || !window.HRIS_CONFIG.API_BASE_URL) {
    throw new Error("HRIS_CONFIG.API_BASE_URL belum dikonfigurasi.");
  }

  function makeError(message, status) {
    var err = new Error(message || "Terjadi kesalahan API.");
    err.status = status || 0;
    return err;
  }

  async function callBackend(functionName, args) {
    var response = await fetch(window.HRIS_CONFIG.API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: functionName,
        args: Array.isArray(args) ? args : []
      })
    });

    var text = await response.text();
    var payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (e) {
      throw makeError("Respons backend tidak valid.", response.status);
    }

    if (!response.ok || !payload || payload.ok !== true) {
      var msg = payload && payload.message ? payload.message : ("HTTP " + response.status);
      throw makeError(msg, response.status);
    }

    var result = payload.result;

    // Business function verifikasiLoginAdmin() asli mengembalikan redirectUrl
    // Apps Script. Pada frontend eksternal, arahkan ke dashboard frontend.
    if (functionName === "verifikasiLoginAdmin" && result && result.status === "success") {
      result.redirectUrl = String(window.HRIS_CONFIG.APP_BASE_URL || "").replace(/\/$/, "") + "/dashboard.html";
    }

    return result;
  }

  function createRunner(chain) {
    var runner = {};

    runner.withSuccessHandler = function (fn) {
      chain.success = typeof fn === "function" ? fn : null;
      return createRunner(chain);
    };

    runner.withFailureHandler = function (fn) {
      chain.failure = typeof fn === "function" ? fn : null;
      return createRunner(chain);
    };

    return new Proxy(runner, {
      get: function (target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== "string") return target[prop];

        return function () {
          var args = Array.prototype.slice.call(arguments);
          var success = chain.success;
          var failure = chain.failure;

          callBackend(prop, args)
            .then(function (result) {
              if (success) success(result);
            })
            .catch(function (error) {
              if (failure) failure(error);
              else console.error("HRIS API error:", error);
            });
        };
      }
    });
  }

  // Kompatibilitas dengan bentuk lama google.script.run.
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunner({ success: null, failure: null });

  window.HRISFrontend = {
    getAppBaseUrl: function () {
      return String(window.HRIS_CONFIG.APP_BASE_URL || "").replace(/\/$/, "");
    },
    getLoginUrl: function () {
      return String(window.HRIS_CONFIG.APP_BASE_URL || "").replace(/\/$/, "") + "/index.html";
    }
  };
})();
