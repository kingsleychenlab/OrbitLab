import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Note: rendered WITHOUT React.StrictMode. StrictMode double-invokes effects in
// development, which would create and immediately dispose a second WebGL context
// (and a second animation loop). A single long-lived SceneManager is cleaner and
// avoids that churn — see rendering/Viewport.tsx.
const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');
createRoot(container).render(<App />);
