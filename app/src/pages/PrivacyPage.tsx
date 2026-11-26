import { Mail, ShieldCheck } from 'lucide-react';
import { SiteLayout } from './SiteLayout';

export function PrivacyPage() {
  return (
    <SiteLayout active="privacy">
      <article className="site-page">
        <div className="site-page-head">
          <div className="site-eyebrow">
            <ShieldCheck size={15} /> Datenschutz
          </div>
          <h1>Datenschutzerklärung</h1>
          <p>
            Der Schutz deiner persönlichen Daten ist uns wichtig. Diese Erklärung informiert
            darüber, welche Daten beim Besuch dieser Website und bei der Nutzung des
            Gestell-Konfigurators verarbeitet werden.
          </p>
        </div>

        <div className="site-note">
          <strong>Hinweis zur Vorlage:</strong> Die nachfolgenden Angaben sind ein sorgfältig
          erstellter Entwurf. Vor der Veröffentlichung müssen die Platzhalter beim Verantwortlichen
          ergänzt und die Angaben an den tatsächlichen Betrieb angepasst werden. Diese Seite stellt
          keine Rechtsberatung dar.
        </div>

        <h2>1. Verantwortlicher</h2>
        <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
        <address className="site-address">
          <strong>[Vor- und Nachname / Firma]</strong>
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ Ort]
          <br />
          Deutschland
          <br />
          E-Mail: <a href="mailto:cornelius@bortmann.de">cornelius@bortmann.de</a>
        </address>

        <h2>2. Hosting über GitHub Pages</h2>
        <p>
          Diese Website wird als statische Website über GitHub Pages bereitgestellt. Anbieter ist
          die GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA.
        </p>
        <p>
          Beim Aufruf der Website verarbeitet GitHub technisch erforderliche Verbindungsdaten, um
          die Seiten auszuliefern und die Systemsicherheit zu gewährleisten. Dazu können
          insbesondere IP-Adresse, Zeitpunkt des Zugriffs, aufgerufene Datei, Referrer, Browser-
          und Betriebssysteminformationen gehören. Auf diese Server-Logs haben wir keinen
          unmittelbaren Einfluss.
        </p>
        <p>
          Weitere Informationen findest du in der Datenschutzerklärung von GitHub:{' '}
          <a
            href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
            target="_blank"
            rel="noreferrer"
          >
            GitHub General Privacy Statement
          </a>
          .
        </p>
        <p>
          Rechtsgrundlage ist unser berechtigtes Interesse an einer sicheren und stabilen
          Bereitstellung der Website gemäß Art. 6 Abs. 1 lit. f DSGVO.
        </p>

        <h2>3. Keine Analyse- und Tracking-Tools</h2>
        <p>
          Der Gestell-Konfigurator verwendet keine Analyse-, Werbe- oder Tracking-Dienste. Es werden
          keine Nutzungsprofile erstellt und keine Daten zu Werbezwecken an Dritte übermittelt.
        </p>

        <h2>4. Cookies und lokale Speicherung</h2>
        <p>
          Die Anwendung selbst setzt keine Cookies zu Analyse- oder Marketingzwecken ein. Zur
          Bedienung des Konfigurators ist keine Anmeldung erforderlich. Projekte werden nicht
          automatisch an einen Server übertragen.
        </p>
        <p>
          Wenn du ein Projekt als JSON-Datei speicherst, geschieht dies lokal über deinen Browser.
          Die Datei verbleibt auf deinem Gerät. Beim Laden einer Projektdatei wird diese
          ausschließlich lokal im Browser eingelesen.
        </p>

        <h2>5. PDF-, CSV- und ZIP-Export</h2>
        <p>
          Bemaßungszeichnungen, Stücklisten und ZIP-Archive werden vollständig in deinem Browser
          erzeugt. Die dafür benötigten STL-Dateien werden als statische Dateien von dieser Website
          geladen. Eine Übertragung deiner Projekt- oder Konstruktionsdaten an uns findet dabei
          nicht statt.
        </p>

        <h2>6. Kontaktaufnahme</h2>
        <p>
          Wenn du per E-Mail Kontakt aufnimmst, werden die von dir übermittelten Angaben
          (insbesondere Name, E-Mail-Adresse und Nachricht) zur Bearbeitung deiner Anfrage
          verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO bei vertragsbezogenen
          Anfragen, ansonsten Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung
          von Anfragen).
        </p>
        <p>
          Die Daten werden gelöscht, sobald die Anfrage abschließend bearbeitet ist und keine
          gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>

        <h2>7. Empfänger und Drittlandübermittlung</h2>
        <p>
          Eine Weitergabe deiner Daten an Dritte erfolgt nur, soweit dies gesetzlich vorgeschrieben
          ist oder zur Vertragserfüllung erforderlich ist. Im Rahmen des Hostings über GitHub Pages
          können Daten in die USA übermittelt werden. GitHub stützt solche Übermittlungen nach
          eigenen Angaben auf geeignete Garantien wie die EU-Standardvertragsklauseln.
        </p>

        <h2>8. Deine Rechte</h2>
        <p>Du hast nach der DSGVO insbesondere folgende Rechte:</p>
        <ul className="site-list">
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>Recht auf Löschung (Art. 17 DSGVO)</li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Recht auf Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
          <li>Recht auf Widerruf einer erteilten Einwilligung (Art. 7 Abs. 3 DSGVO)</li>
        </ul>
        <p>
          Zur Ausübung deiner Rechte genügt eine Nachricht an die oben genannte Kontaktadresse.
        </p>

        <h2>9. Beschwerderecht bei der Aufsichtsbehörde</h2>
        <p>
          Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung
          deiner personenbezogenen Daten zu beschweren. Zuständig ist in der Regel die
          Aufsichtsbehörde deines Wohnsitzes oder des Ortes des vermuteten Verstoßes.
        </p>

        <h2>10. Sicherheit und Aktualität</h2>
        <p>
          Es werden angemessene technische und organisatorische Maßnahmen eingesetzt, um deine
          Daten gegen Verlust, Manipulation und unbefugten Zugriff zu schützen. Diese
          Datenschutzerklärung wird bei Änderungen der Website oder der rechtlichen Rahmenbedingungen
          angepasst.
        </p>

        <div className="site-contact-card">
          <Mail size={20} />
          <div>
            <strong>Fragen zum Datenschutz?</strong>
            <p>Schreib an die im Impressum bzw. oben genannte Kontaktadresse.</p>
          </div>
          <a className="site-btn site-btn-ghost" href="#/impressum">
            Zum Impressum
          </a>
        </div>

        <p className="site-stand">Stand: November 2026</p>
      </article>
    </SiteLayout>
  );
}
