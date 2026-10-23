// ./js/themeManager.js

export function initThemeManager() {
  const btn = document.getElementById('theme-menu-btn');
  const menu = document.getElementById('theme-dropdown-menu');
  const iconLabel = document.getElementById('theme-current-icon');
  const textLabel = document.getElementById('theme-current-label');

  if (!btn || !menu) return;

  // Toggle dropdown display on click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });

  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(themeChoice) {
    const isSystemDark = systemDarkQuery.matches;

    if (themeChoice === 'light') {
      document.body.classList.add('light-mode');
      if (iconLabel) iconLabel.textContent = '☀️';
      if (textLabel) textLabel.textContent = 'Light Theme';
    } else if (themeChoice === 'dark') {
      document.body.classList.remove('light-mode');
      if (iconLabel) iconLabel.textContent = '🌙';
      if (textLabel) textLabel.textContent = 'Dark Theme';
    } else {
      // Device Default (Syncs with OS preference)
      if (isSystemDark) {
        document.body.classList.remove('light-mode');
      } else {
        document.body.classList.add('light-mode');
      }
      if (iconLabel) iconLabel.textContent = '💻';
      if (textLabel) textLabel.textContent = 'Device Default';
    }

    localStorage.setItem('stu_nurse_theme_mode', themeChoice);
  }

  // Handle option clicks
  menu.querySelectorAll('button[data-theme]').forEach(option => {
    option.addEventListener('click', (e) => {
      const choice = e.currentTarget.getAttribute('data-theme');
      applyTheme(choice);
      menu.style.display = 'none';
    });
  });

  // Listen for real-time OS theme changes if "Device Default" is selected
  systemDarkQuery.addEventListener('change', () => {
    const currentStored = localStorage.getItem('stu_nurse_theme_mode') || 'system';
    if (currentStored === 'system') {
      applyTheme('system');
    }
  });

  // Initial load check
  const savedTheme = localStorage.getItem('stu_nurse_theme_mode') || 'system';
  applyTheme(savedTheme);
}

document.addEventListener('DOMContentLoaded', initThemeManager);