(() => {
  function globToRegex(pattern) {
    const escaped = String(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$', 'i');
  }

  // Treat `www.` as noise. `www.google.com/*` and `google.com/*` should both
  // match `www.google.com` and `google.com`. Strip it from the pattern's
  // leading host part and from the URL's hostname before comparing.
  function stripWww(host) {
    return host.startsWith('www.') ? host.slice(4) : host;
  }

  function normalizePattern(pattern) {
    const str = String(pattern);
    const slashIdx = str.indexOf('/');
    const host = slashIdx === -1 ? str : str.slice(0, slashIdx);
    const rest = slashIdx === -1 ? '' : str.slice(slashIdx);
    return stripWww(host) + rest;
  }

  function hostMatches(pattern, url) {
    if (!pattern) return false;
    try {
      const u = new URL(url);
      const host = stripWww(u.hostname);
      const hostPath = host + u.pathname;
      const regex = globToRegex(normalizePattern(pattern));
      return regex.test(hostPath) || regex.test(host);
    } catch {
      return false;
    }
  }

  function textMatches(pattern, mode, text) {
    if (!pattern) return true;
    if (mode === 'regex') {
      try {
        return new RegExp(pattern, 'i').test(text);
      } catch {
        return false;
      }
    }
    return String(text).toLowerCase().includes(String(pattern).toLowerCase());
  }

  const api = { globToRegex, hostMatches, textMatches };

  if (typeof self !== 'undefined') self.OscarMatching = api;
  if (typeof window !== 'undefined') window.OscarMatching = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
