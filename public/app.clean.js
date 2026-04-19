(() => {
  function loadLegacyCleanupChain() {
    if (document.querySelector('script[data-clean-entry="1"]')) return;
    const script = document.createElement('script');
    script.src = '/hotfix.js?v=2';
    script.dataset.cleanEntry = '1';
    document.body.appendChild(script);
  }

  function install() {
    loadLegacyCleanupChain();
    if (typeof window.updateDebug === 'function') {
      window.updateDebug({ cleanEntry: 'app.clean.js' });
    }
    console.info('[SF_SLG clean] app.clean.js bootstrap installed.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
