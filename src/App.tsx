import { useState } from 'react';
import { useOrbitLab } from './state/useOrbitLab';
import { Viewport } from './rendering/Viewport';
import { TopBar } from './ui/TopBar';
import { LeftSidebar } from './ui/LeftSidebar';
import { RightSidebar } from './ui/RightSidebar';
import { Dock } from './ui/Dock';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { ViewportFallback } from './ui/ViewportFallback';

type Drawer = 'none' | 'left' | 'right';

export default function App() {
  const store = useOrbitLab();
  // Mobile drawer state (sidebars overlay the viewport on narrow screens).
  const [drawer, setDrawer] = useState<Drawer>('none');

  const toggle = (side: 'left' | 'right') =>
    setDrawer((d) => (d === side ? 'none' : side));

  return (
    <div className="app" data-drawer={drawer === 'none' ? undefined : drawer}>
      <TopBar store={store} onToggleLeft={() => toggle('left')} onToggleRight={() => toggle('right')} />

      <div className="app-main">
        <LeftSidebar store={store} />

        <div className="viewport-wrap" style={{ position: 'relative', minWidth: 0 }}>
          <ErrorBoundary fallback={() => <ViewportFallback store={store} />}>
            <Viewport onReady={store.attachScene} />
            <div className="viewport__badge">
              <div className="name">{store.systemName}</div>
              <div className="desc">{store.systemDescription}</div>
            </div>
            <div className="viewport__hint">
              drag to orbit · scroll to zoom · right-drag to pan · click a body to select
            </div>
          </ErrorBoundary>
        </div>

        <RightSidebar store={store} />
      </div>

      <Dock store={store} />
    </div>
  );
}
