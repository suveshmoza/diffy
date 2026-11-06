import { createRoot } from 'react-dom/client';

import { PopupApp } from '@/domains/popup/PopupApp';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<PopupApp />);
}
