(function () {

  'use strict';


  // ============================================================
  // KONFIGURASI
  // ============================================================

  var CONFIG = window.HRIS_CONFIG || {};

  var APPS_SCRIPT_URL =
    CONFIG.APPS_SCRIPT_URL || '';


  var BRIDGE_URL =
    APPS_SCRIPT_URL +
    (
      APPS_SCRIPT_URL.indexOf('?') >= 0
        ? '&'
        : '?'
    ) +
    'page=bridge';


  // ============================================================
  // VARIABLE INTERNAL
  // ============================================================

  var bridgeFrame = null;

  var bridgeReady = false;

  var bridgeReadyPromise = null;

  var requestCounter = 0;

  var pendingRequests = {};


  // ============================================================
  // MEMBUAT REQUEST ID
  // ============================================================

  function createRequestId() {

    requestCounter++;

    return (
      'hris_' +
      Date.now() +
      '_' +
      requestCounter +
      '_' +
      Math.random()
        .toString(36)
        .substring(2, 10)
    );

  }


  // ============================================================
  // MEMBUAT IFRAME BRIDGE
  // ============================================================

  function createBridge() {

    if (bridgeFrame) {
      return bridgeFrame;
    }


    bridgeFrame =
      document.createElement('iframe');


    bridgeFrame.style.position =
      'fixed';

    bridgeFrame.style.width =
      '1px';

    bridgeFrame.style.height =
      '1px';

    bridgeFrame.style.border =
      '0';

    bridgeFrame.style.opacity =
      '0';

    bridgeFrame.style.pointerEvents =
      'none';

    bridgeFrame.style.left =
      '-9999px';

    bridgeFrame.style.top =
      '-9999px';


    bridgeFrame.setAttribute(
      'aria-hidden',
      'true'
    );


    bridgeFrame.src =
      BRIDGE_URL;


    document.body.appendChild(
      bridgeFrame
    );


    return bridgeFrame;

  }


  // ============================================================
  // MENUNGGU BRIDGE SIAP
  // ============================================================

  function waitForBridge() {

    if (bridgeReady) {

      return Promise.resolve();

    }


    if (bridgeReadyPromise) {

      return bridgeReadyPromise;

    }


    bridgeReadyPromise =
      new Promise(
        function (resolve, reject) {

          var timeout =
            setTimeout(
              function () {

                bridgeReadyPromise =
                  null;

                reject(
                  new Error(
                    'Bridge Apps Script tidak merespons.'
                  )
                );

              },
              30000
            );


          function readyHandler(event) {

            if (
              !bridgeFrame ||
              event.source !==
                bridgeFrame.contentWindow
            ) {

              return;

            }


            if (
              !event.data ||
              event.data.type !==
                'HRIS_BRIDGE_READY'
            ) {

              return;

            }


            clearTimeout(timeout);


            bridgeReady =
              true;


            window.removeEventListener(
              'message',
              readyHandler
            );


            resolve();

          }


          window.addEventListener(
            'message',
            readyHandler
          );


          createBridge();

        }
      );


    return bridgeReadyPromise;

  }


  // ============================================================
  // MENERIMA RESPONSE DARI BRIDGE
  // ============================================================

  window.addEventListener(
    'message',
    function (event) {

      if (
        !bridgeFrame ||
        event.source !==
          bridgeFrame.contentWindow
      ) {

        return;

      }


      var data =
        event.data;


      if (
        !data ||
        data.type !==
          'HRIS_BRIDGE_RESPONSE'
      ) {

        return;

      }


      var requestId =
        data.id;


      if (
        !requestId ||
        !pendingRequests[requestId]
      ) {

        return;

      }


      var request =
        pendingRequests[
          requestId
        ];


      delete pendingRequests[
        requestId
      ];


      if (data.ok) {

        if (
          typeof request.successHandler ===
          'function'
        ) {

          request.successHandler(
            data.result
          );

        }

      } else {

        var error =
          new Error(
            data.error ||
            'Terjadi kesalahan pada Apps Script.'
          );


        if (
          typeof request.failureHandler ===
          'function'
        ) {

          request.failureHandler(
            error
          );

        }

      }

    }
  );


  // ============================================================
  // MENJALANKAN BACKEND FUNCTION
  // ============================================================

  function callBackend(
    functionName,
    args,
    successHandler,
    failureHandler
  ) {

    waitForBridge()

      .then(
        function () {

          var requestId =
            createRequestId();


          pendingRequests[
            requestId
          ] = {

            successHandler:
              successHandler,

            failureHandler:
              failureHandler

          };


          bridgeFrame.contentWindow.postMessage(
            {
              type:
                'HRIS_BRIDGE_REQUEST',

              id:
                requestId,

              action:
                functionName,

              args:
                Array.isArray(args)
                  ? args
                  : []

            },

            '*'
          );

        }
      )

      .catch(
        function (error) {

          if (
            typeof failureHandler ===
            'function'
          ) {

            failureHandler(
              error
            );

          }

        }
      );

  }


  // ============================================================
  // COMPATIBILITY LAYER
  // ============================================================

  function createRunner(
    successHandler,
    failureHandler
  ) {

    var runner = {

      withSuccessHandler:
        function (handler) {

          return createRunner(
            handler,
            failureHandler
          );

        },


      withFailureHandler:
        function (handler) {

          return createRunner(
            successHandler,
            handler
          );

        }

    };


    return new Proxy(
      runner,
      {

        get:
          function (
            target,
            property
          ) {

            if (
              property in target
            ) {

              return target[
                property
              ];

            }


            if (
              typeof property !==
              'string'
            ) {

              return undefined;

            }


            return function () {

              var args =
                Array.prototype.slice.call(
                  arguments
                );


              callBackend(
                property,
                args,
                successHandler,
                failureHandler
              );

            };

          }

      }
    );

  }


  // ============================================================
  // MEMBUAT GOOGLE.SCRIPT.RUN
  // ============================================================

  window.google =
    window.google || {};


  window.google.script =
    window.google.script || {};


  window.google.script.run =
    createRunner(
      null,
      null
    );


})();
