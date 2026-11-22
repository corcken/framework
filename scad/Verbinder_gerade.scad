/*
 * Modulares OpenSCAD Modell: 180-Grad Geradverbinder (Rohrverlängerung)
 * Funktion: Verbindet zwei Rohre in einer Linie mit innerem Mittelanschlag.
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875)); // Einstecktiefe pro Seite
anschlag_dicke = 3.0;
gesamt_laenge = (muffen_laenge * 2) + anschlag_dicke;

// Bohrungen für die Fixierschrauben
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
verbinder_gerade();

module verbinder_gerade() {
    difference() {
        // Äußerer Zylinder entlang Z
        cylinder(d=aussen_durchmesser, h=gesamt_laenge, center=true);

        // Untere Rohr-Aussparung (lässt in der Mitte anschlag_dicke stehen)
        translate([0, 0, -(anschlag_dicke/2) - muffen_laenge - 1])
            cylinder(d=innen_durchmesser, h=muffen_laenge + 1);

        // Obere Rohr-Aussparung
        translate([0, 0, anschlag_dicke/2])
            cylinder(d=innen_durchmesser, h=muffen_laenge + 1);

        // Fixierbohrungen je Seite
        translate([aussen_durchmesser/2, 0, (anschlag_dicke/2) + (muffen_laenge/2)])
            rotate([0, 90, 0])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
        translate([aussen_durchmesser/2, 0, -(anschlag_dicke/2) - (muffen_laenge/2)])
            rotate([0, 90, 0])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    }
}
