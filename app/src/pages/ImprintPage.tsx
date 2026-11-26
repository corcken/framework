import { FileText, Mail, MapPin, ShieldAlert } from 'lucide-react';
import { SiteLayout } from './SiteLayout';

export function ImprintPage() {
  return (
    <SiteLayout active="imprint">
      <article className="site-page">
        <div className="site-page-head">
          <div className="site-eyebrow">
            <FileText size={15} /> Impressum
          </div>
          <h1>Impressum</h1>
          <p>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).</p>
        </div>

        <div className="site-note">
          <strong>Hinweis zur Vorlage:</strong> Die Platzhalter in diesem Impressum müssen vor der
          Veröffentlichung durch die tatsächlichen Anbieterdaten ersetzt werden. Ein unvollständiges
          Impressum kann rechtliche Konsequenzen haben. Diese Seite stellt keine Rechtsberatung dar.
        </div>

        <h2>Anbieter</h2>
        <address className="site-address">
          <strong>[Vor- und Nachname / Firma]</strong>
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ Ort]
          <br />
          Deutschland
        </address>

        <div className="site-address-grid">
          <div className="site-address">
            <h3>
              <Mail size={17} /> Kontakt
            </h3>
            <p>
              E-Mail: <a href="mailto:cornelius@bortmann.de">cornelius@bortmann.de</a>
              <br />
              Telefon: [Telefonnummer, optional]
            </p>
          </div>
          <div className="site-address">
            <h3>
              <MapPin size={17} /> Verantwortlich für den Inhalt
            </h3>
            <p>
              [Vor- und Nachname]
              <br />
              Anschrift wie oben
            </p>
          </div>
        </div>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen.
        </p>
        <p>
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
          allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst
          ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden
          von entsprechenden Rechtsverletzungen entfernen wir diese Inhalte umgehend.
        </p>

        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
          mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der
          Verlinkung nicht erkennbar.
        </p>
        <p>
          Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
          Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
          Rechtsverletzungen entfernen wir solche Links umgehend.
        </p>

        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
          dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
          der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
          Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
        <p>
          Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch
          gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden
          die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
          gekennzeichnet. Solltest du trotzdem auf eine Urheberrechtsverletzung aufmerksam werden,
          bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen
          entfernen wir solche Inhalte umgehend.
        </p>

        <h2>Hinweis zu technischen Berechnungen und 3D-Druckteilen</h2>
        <div className="site-safety-note">
          <ShieldAlert size={22} />
          <div>
            <strong>Keine Gewähr für Statik und Belastbarkeit</strong>
            <p>
              Die im Konfigurator angezeigten Maße, Stücklisten und Belastungsschätzungen werden
              automatisiert berechnet und dienen ausschließlich der Orientierung. Sie ersetzen keine
              statische Prüfung, keine Werkstoffprüfung und keine Sicherheitsbewertung. Insbesondere
              3D-gedruckte Verbinder aus PLA oder PETG können unter Last kriechen oder brechen.
              Für Schäden, die aus der Nutzung der berechneten Daten oder der gefertigten Bauteile
              entstehen, wird – soweit gesetzlich zulässig – keine Haftung übernommen.
            </p>
          </div>
        </div>

        <p className="site-stand">Stand: November 2026</p>
      </article>
    </SiteLayout>
  );
}
