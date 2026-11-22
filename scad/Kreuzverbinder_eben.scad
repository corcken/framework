/*
 * ENTWURF: 4-Wege Kreuzverbinder in einer Ebene (+)
 * Funktion: Verbindet ein durchgehendes Rohr (X) mit zwei gegenüberliegenden
 *           90°-Abgängen (+Y und -Y) auf derselben Ebene.
 */

$fn = 100;

rohr_nennmass = 40.0;
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : (rohr_nennmass <= 30) ? 4.0 : 4.5;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(22.0, round(rohr_nennmass * 0.875));
gesamt_laenge = (muffen_laenge * 2) + aussen_durchmesser;
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

kreuzverbinder_eben();

module kreuzverbinder_eben() {
    difference() {
        union() {
            rotate([0, 90, 0])
                cylinder(d=aussen_durchmesser, h=gesamt_laenge, center=true);
            rotate([90, 0, 0])
                cylinder(d=aussen_durchmesser, h=gesamt_laenge, center=true);
        }
        rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=gesamt_laenge + 2, center=true);
        rotate([90, 0, 0])
            cylinder(d=innen_durchmesser, h=gesamt_laenge + 2, center=true);

        // 4 Fixierbohrungen
        for (s = [-1, 1]) {
            translate([s * (aussen_durchmesser/2 + muffen_laenge/2), 0, aussen_durchmesser/2])
                cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
            translate([0, s * (aussen_durchmesser/2 + muffen_laenge/2), aussen_durchmesser/2])
                cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
        }
    }
}
