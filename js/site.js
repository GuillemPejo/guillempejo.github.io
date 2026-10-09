// Selector de idioma EN/ES. El idioma inicial lo fija el script del <head> (?lang=, elección guardada o navegador).
(function () {
  var root = document.documentElement;
  var buttons = document.querySelectorAll('[data-set-lang]');

  function apply(lang) {
    root.setAttribute('data-lang', lang);
    root.lang = lang;
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)); });
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      apply(b.dataset.setLang);
      try { localStorage.setItem('lang', b.dataset.setLang); } catch (e) {}
    });
  });

  apply(root.getAttribute('data-lang') === 'es' ? 'es' : 'en');
})();
