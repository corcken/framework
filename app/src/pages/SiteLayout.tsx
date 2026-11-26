import type { ReactNode } from 'react';
import { ArrowRight, Box } from 'lucide-react';
import './site.css';

export type SitePage = 'home' | 'privacy' | 'imprint';

export const SiteLayout: React.FC<{
  children: ReactNode;
  active?: SitePage;
}> = ({ children, active }) => (
  <div className="site-shell">
    <header className="site-nav">
      <a className="site-brand" href="#/" title="Zur Startseite">
        <span className="site-brand-mark">
          <Box size={21} />
        </span>
        <span>
          Gestell<span className="site-brand-accent">Konfigurator</span>
        </span>
      </a>

      <nav className="site-nav-links" aria-label="Hauptnavigation">
        <a className={active === 'home' ? 'active' : ''} href="#/">
          Startseite
        </a>
        <a className={active === 'privacy' ? 'active' : ''} href="#/datenschutz">
          Datenschutz
        </a>
        <a className={active === 'imprint' ? 'active' : ''} href="#/impressum">
          Impressum
        </a>
        <a className="site-nav-cta" href="#/konfigurator">
          Konfigurator starten <ArrowRight size={15} />
        </a>
      </nav>
    </header>

    <main className="site-main">{children}</main>

    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <strong>Gestell-Konfigurator</strong>
          <div className="site-footer-note">
            Browserbasiertes Planungswerkzeug für Rohrgestelle mit 3D-gedruckten Verbindern.
          </div>
        </div>
        <div className="site-footer-links">
          <a href="#/">Startseite</a>
          <a href="#/konfigurator">Konfigurator</a>
          <a href="#/datenschutz">Datenschutz</a>
          <a href="#/impressum">Impressum</a>
          <a href="https://github.com/corcken/framework" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
);
