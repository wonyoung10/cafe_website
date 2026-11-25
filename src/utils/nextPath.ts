function unsafe(value: string) {
  return value.includes('\\') || [...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || unsafe(value)) return '/';
  try {
    const url = new URL(value, 'https://internal.invalid');
    const path = decodeURIComponent(url.pathname);
    if (unsafe(path) || path.startsWith('//') || /^\/(?:login|signup)\/*$/i.test(path)) return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
