import { ArrowRight, FileText, Github, Layers, Printer, ShieldAlert, Wrench } from 'lucide-react';
import { SiteLayout } from './SiteLayout';

export function LandingPage() {
  return (
    <SiteLayout active="home">
      <div className="lp-page">
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <div className="lp-ribbon">99% KI generiert</div>
            <div className="site-eyebrow">
              <Wrench size={14} /> DIY · Rohre · 3D-Druck · kostenlos
            </div>
            <h1>Rohrgestelle selbst planen und bauen.</h1>
            <p>
              Der Konfigurator ist ein kostenloses Werkzeug für Gestelle, Tische, Regale und
              Halterungen. Du planst den Aufbau aus Rohren und 3D-gedruckten Verbindern, berechnest
              Längen und Stücklisten und druckst die Verbinder selbst. Vorhandene Rohrreste lassen
              sich dabei verwenden.
            </p>
            <div className="lp-actions">
              <a className="site-btn site-btn-primary" href="#/konfigurator">
                Konfigurator öffnen <ArrowRight size={16} />
              </a>
              <a
                className="site-btn site-btn-ghost"
                href="https://github.com/corcken/framework"
                target="_blank"
                rel="noreferrer"
              >
                <Github size={16} /> GitHub-Repository
              </a>
            </div>
          </div>

          <div className="lp-hero-side">
            <div className="lp-media-card">
              <img src="previews/hero_connectors_render.png" alt="Rendering zweier 3D-gedruckter Verbinder für Rundrohre" />
              <div className="lp-media-caption">
                <Layers size={14} /> 3D-gedruckte Verbinder für Rundrohre
              </div>
            </div>
          </div>
        </section>

        <section className="lp-blocks">
          <article className="lp-card">
            <h2>
              <FileText size={16} /> Planen
            </h2>
            <p>
              Bauteile im 3D-Editor platzieren, verschieben und drehen. Rohre und Verbinder werden
              verbunden. Aus dem Modell entstehen PDF-Zeichnung, Stückliste und Zuschnittlängen.
              Geeignet für Regale, Tische, Werkstattgestelle und Halterungen.
            </p>
          </article>

          <article className="lp-card">
            <h2>
              <Wrench size={16} /> Reste verwenden
            </h2>
            <p>
              Rohre aus Metall, Kunststoff, Kupfer oder anderen Werkstoffen sind möglich, wenn der
              Außendurchmesser passt. Vorhandene Reststücke werden auf ihre benötigte Länge
              zugeschnitten. Aktuell sind runde Rohre umgesetzt; Vierkant-Rohre sind geplant.
            </p>
          </article>

          <article className="lp-card">
            <h2>
              <Printer size={16} /> Drucken & exportieren
            </h2>
            <p>
              Die Verbinder werden als STL exportiert und selbst gedruckt. Üblich sind PLA und
              PETG; andere druckbare Kunststoffe sind möglich. Die OpenSCAD-Dateien stehen zum
              Download bereit und lassen sich anpassen, um die Verbinder weiterzuentwickeln.
            </p>
          </article>
        </section>

        <section className="lp-examples" aria-label="Beispielprojekte">
          {[
            { title: 'Regal', image: 'previews/examples/regal.png' },
            { title: 'Tisch', image: 'previews/examples/tisch.png' },
            { title: 'Werkstattgestell', image: 'previews/examples/werkstattgestell.png' },
          ].map(({ title, image }) => (
            <article className="lp-example" key={title}>
              <div className="lp-example-media">
                <img src={image} alt={`Beispiel ${title}`} />
              </div>
              <div className="lp-example-caption">{title}</div>
            </article>
          ))}
        </section>

        <div className="lp-note">
          <ShieldAlert size={17} />
          <span>
            Die Belastungsschätzung ist unverbindlich. 3D-gedruckte Teile unter Last prüfen und
            ausreichend dimensionieren.
          </span>
        </div>
      </div>
    </SiteLayout>
  );
}
