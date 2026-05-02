/** Redirect when wiki is embedded in a foreign iframe (paired with CSP script-src 'self'). */
(function () {
  if (window.self !== window.top) {
    window.top.location = window.location.href;
  }
})();
