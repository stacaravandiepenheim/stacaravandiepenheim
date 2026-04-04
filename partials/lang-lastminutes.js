function updateLastMinutesLanguage() {
  const pageLang = document.documentElement.lang || 'nl';

  document.querySelectorAll('.lm-block').forEach(block => {
    block.style.display = block.dataset.lang === pageLang ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateLastMinutesLanguage();

  const observer = new MutationObserver(() => {
    updateLastMinutesLanguage();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});