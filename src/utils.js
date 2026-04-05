export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const RESERVED_SLUGS = new Set([
  'assets', 'api', 'admin', 'static', 'public', 'media', 'upload', 'uploads',
  'files', 'images', 'img', 'js', 'css', 'fonts', 'favicon', 'robots',
  'sitemap', 'feed', 'rss', 'atom', 'auth', 'login', 'logout', 'signup',
  'register', 'dashboard', 'settings', 'profile', 'account',
]);

// Debounce delay (ms) for auto-save in page/home editors
export const AUTOSAVE_DELAY_MS = 1500;

// Auto-dismiss delay (ms) for toast notifications
export const TOAST_DURATION_MS = 3000;

// Delay (ms) before focusing an input that was just revealed (allows CSS transitions to settle)
export const FOCUS_DELAY_MS = 50;
