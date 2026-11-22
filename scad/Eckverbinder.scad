/*
 * Modulares OpenSCAD Modell: 90-Grad Eckverbinder (2-fach)
 * Funktion: Verbindet zwei Rohre im rechten Winkel.
 * Beide Muffen haben eine eigene Bohrung für eine Fixierschraube.
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875));

// Bohrungen für die Fixierschrauben
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
rohrverbinder_90_grad();

module rohrverbinder_90_grad() {
    difference() {
        grundform_winkel();
        aussparung_rohrkanaele();
        bohrungen_madenschrauben();
    }
}

module grundform_winkel() {
    union() {
        sphere(d=aussen_durchmesser);
        rotate([0, 90, 0])
            cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
        rotate([-90, 0, 0])
            cylinder(d=aussen_durchmesser, h=muffen_laenge + (aussen_durchmesser/2));
    }
}

module aussparung_rohrkanaele() {
    union() {
        sphere(d=innen_durchmesser);
        rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
        rotate([-90, 0, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + aussen_durchmesser + 2);
    }
}

module bohrungen_madenschrauben() {
    translate([(aussen_durchmesser/2) + (muffen_laenge/2), 0, (aussen_durchmesser/2)])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    translate([0, (aussen_durchmesser/2) + (muffen_laenge/2), (aussen_durchmesser/2)])
        cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
}
