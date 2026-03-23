let _pageId = '';
let _pagePath = '';

function generatePageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function setPage(path: string): void {
  _pageId = generatePageId();
  _pagePath = path;
}

export function getPageAttributes(): Record<string, string> {
  return {
    'page.id': _pageId,
    'page.path': _pagePath,
  };
}