(() => {
  function globToRegex(pattern) {
    const escaped = String(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$', 'i');
  }

  function hostMatches(pattern, url) {
    if (!pattern) return false;
    try {
      const u = new URL(url);
      const hostPath = u.hostname + u.pathname;
      const regex = globToRegex(pattern);
      return regex.test(hostPath) || regex.test(u.hostname);
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
