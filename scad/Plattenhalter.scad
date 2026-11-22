/*
 * ENTWURF: Platten- & Regalboden-Halter (verstärkt)
 * Funktion: Rohrmuffe mit stabiler, 6 mm starker Auflagefläche, 3 dreieckigen
 *           Verstärkungsrippen (links, mitte, rechts) und 2 Senklöchern
 *           zum Anschrauben von Holz-, Siebdruck- oder Acrylplatten.
 */

$fn = 100;

rohr_nennmass = 40.0;
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : 4.0;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(36.0, round(rohr_nennmass * 1.1));

lasche_laenge = 30.0;
lasche_dicke = 6.0;
rippen_dicke = 5.0;
loch_durchmesser_platte = 4.5;
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

plattenhalter();

module plattenhalter() {
    difference() {
        union() {
            // Rohrmuffe (entlang X)
            rotate([0, 90, 0])
                cylinder(d=aussen_durchmesser, h=muffen_laenge, center=true);

            // Flache Auflageplatte oben (+Z tangierend, nach +Y auskragend)
            translate([0, (aussen_durchmesser/2) + (lasche_laenge/2) - 4, (aussen_durchmesser/2) - (lasche_dicke/2)])
                cube([muffen_laenge, lasche_laenge + 8, lasche_dicke], center=true);

            // 3 stabile dreieckige Verstärkungsrippen (links, mitte, rechts)
            for (rx = [-(muffen_laenge/2 - rippen_dicke/2), 0, (muffen_laenge/2 - rippen_dicke/2)]) {
                translate([rx, 0, 0])
                    hull() {
                        // Anschluss an der Rohrmuffe (von Mitte bis Oberkante)
                        translate([0, aussen_durchmesser/2 - 2, 0])
                            cube([rippen_dicke, 4, aussen_durchmesser * 0.75], center=true);
                        // Anschluss unter der Auflageplatte bis fast ganz außen
                        translate([0, (aussen_durchmesser/2) + lasche_laenge - 4, (aussen_durchmesser/2) - lasche_dicke])
                            cube([rippen_dicke, 4, 2], center=true);
                    }
            }
        }

        // Rohrkanal
        rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + 2, center=true);

        // 2× Schraublöcher mit Senkung von unten (damit Schrauben von unten in die Platte geschraubt werden können)
        // bzw. Durchgangsloch für M4/4,5mm Holzschraube
        for (x = [-muffen_laenge/4, muffen_laenge/4]) {
            translate([x, (aussen_durchmesser/2) + (lasche_laenge/2), (aussen_durchmesser/2) - (lasche_dicke/2)]) {
                cylinder(d=loch_durchmesser_platte, h=lasche_dicke + 2, center=true);
                // Senkung von unten für Schraubenkopf
                translate([0, 0, -(lasche_dicke/2) - 0.1])
                    cylinder(d1=loch_durchmesser_platte + 4.5, d2=loch_durchmesser_platte, h=2.6);
            }
        }

        // Fixierbohrung am Rohr (gegenüber der Lasche)
        translate([0, -aussen_durchmesser/2, 0])
            rotate([90, 0, 0])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    }
}
