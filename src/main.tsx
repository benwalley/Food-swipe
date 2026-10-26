import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/inter';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createServices } from './app/services';
import { StoreProvider } from './state/StoreProvider';

const services = createServices();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider services={services}>
      <App />
    </StoreProvider>
  </StrictMode>,
);
