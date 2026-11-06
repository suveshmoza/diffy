const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg']);

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
};

export function getPathExtension(path: string): string {
  const base = path.split('/').pop() ?? path;
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) {
    return '';
  }
  return base.slice(dot + 1).toLowerCase();
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(getPathExtension(path));
}

export function mimeTypeForImagePath(path: string): string {
  return IMAGE_MIME_BY_EXTENSION[getPathExtension(path)] ?? 'application/octet-stream';
}
