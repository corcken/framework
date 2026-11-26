import { useEffect, useState } from 'react';
import { App } from './App';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ImprintPage } from './pages/ImprintPage';

type Route = 'home' | 'configurator' | 'privacy' | 'imprint';

function readRoute(): Route {
  const hash = window.location.hash
    .replace(/^#\/?/, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  if (hash === 'konfigurator' || hash === 'app') return 'configurator';
  if (hash === 'datenschutz' || hash === 'privacy') return 'privacy';
  if (hash === 'impressum' || hash === 'imprint') return 'imprint';
  return 'home';
}

export function Root() {
  const [route, setRoute] = useState<Route>(() => readRoute());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === 'configurator') return <App />;
  if (route === 'privacy') return <PrivacyPage />;
  if (route === 'imprint') return <ImprintPage />;
  return <LandingPage />;
}
