export function ThemeInitScript() {
  const themeScript = `
(function () {
  try {
    var storageKey = 'budgetwise-theme';
    var theme = null;
    try {
      theme = localStorage.getItem(storageKey);
    } catch (e) {
      console.warn('Unable to access localStorage for theme', e);
    }
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (err) {
    console.warn('Theme init failed', err);
  }
})();`

  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />
}

