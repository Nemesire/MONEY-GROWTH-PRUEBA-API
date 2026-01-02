import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const init = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("No se encontró el elemento root");
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Esperar a que el DOM esté listo para evitar errores de MutationObserver prematuros
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}