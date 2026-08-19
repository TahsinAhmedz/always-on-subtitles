(function () {
  if (window.__aosCaptionHookInstalled) {
    return;
  }
  window.__aosCaptionHookInstalled = true;

  function isTimedTextUrl(url) {
    return /timedtext|srv3|json3/i.test(url) && url.includes('youtube');
  }

  function dispatchCues(url, data) {
    try {
      window.dispatchEvent(
        new CustomEvent('aos-captions-intercepted', {
          detail: { url, data },
        }),
      );
    } catch {
      // Ignore dispatch failures.
    }
  }

  const originalFetch = window.fetch;
  window.fetch = function fetchWithCaptionHook(...args) {
    return originalFetch.apply(this, args).then((response) => {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (isTimedTextUrl(url)) {
        response
          .clone()
          .json()
          .then((data) => dispatchCues(url, data))
          .catch(() => {});
      }
      return response;
    });
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function openWithCaptionHook(method, url, ...rest) {
    this._aosCaptionUrl = typeof url === 'string' ? url : String(url);
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function sendWithCaptionHook(...args) {
    const requestUrl = this._aosCaptionUrl;
    if (requestUrl && isTimedTextUrl(requestUrl)) {
      this.addEventListener('load', function onCaptionResponse() {
        try {
          dispatchCues(requestUrl, JSON.parse(this.responseText));
        } catch {
          // Ignore malformed caption payloads.
        }
      });
    }
    return originalSend.apply(this, args);
  };
})();
