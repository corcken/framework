/*
 * Modulares OpenSCAD Modell: Gelenkverbinder / Scharnier (2-teilig druckfertig)
 * Funktion: Einstellbarer Winkelverbinder mit Gabel + Lasche und M6-Klemmschraube.
 */

$fn = 100;

rohr_nennmass = 40.0;
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : 4.0;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(24.0, round(rohr_nennmass * 0.875));
loch_durchmesser_rohr = (rohr_nennmass <= 25) ? 3.2 : 4.2;

laschen_dicke = 6.0;
spalt = laschen_dicke + 0.4;
auge_durchmesser = max(20.0, round(rohr_nennmass * 0.65));
bolzen_loch = 6.2; // M6

// Beide Hälften nebeneinander für sauberen 3D-Druck
translate([0, -(aussen_durchmesser * 0.65), 0]) teil_zunge();
translate([0,  (aussen_durchmesser * 0.65), 0]) teil_gabel();

module teil_zunge() {
    difference() {
        union() {
            translate([auge_durchmesser/2 + muffen_laenge/2 + 4, 0, 0])
                rotate([0, 90, 0])
                cylinder(d=aussen_durchmesser, h=muffen_laenge, center=true);
            hull() {
                rotate([90, 0, 0])
                    cylinder(d=auge_durchmesser, h=laschen_dicke, center=true);
                translate([auge_durchmesser/2 + 6, 0, 0])
                    cube([4, laschen_dicke, auge_durchmesser], center=true);
            }
        }
        translate([auge_durchmesser/2 + muffen_laenge/2 + 4, 0, 0])
            rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + 2, center=true);
        rotate([90, 0, 0])
            cylinder(d=bolzen_loch, h=laschen_dicke + 2, center=true);
        translate([auge_durchmesser/2 + muffen_laenge/2 + 4, 0, aussen_durchmesser/2])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    }
}

module teil_gabel() {
    gabel_breite = spalt + (laschen_dicke * 2);
    difference() {
        union() {
            translate([-(auge_durchmesser/2 + muffen_laenge/2 + 4), 0, 0])
                rotate([0, 90, 0])
                cylinder(d=aussen_durchmesser, h=muffen_laenge, center=true);
            hull() {
                rotate([90, 0, 0])
                    cylinder(d=auge_durchmesser, h=gabel_breite, center=true);
                translate([-(auge_durchmesser/2 + 6), 0, 0])
                    cube([4, gabel_breite, auge_durchmesser], center=true);
            }
        }
        translate([4, 0, 0])
            cube([auge_durchmesser + 12, spalt, auge_durchmesser + 4], center=true);
        translate([-(auge_durchmesser/2 + muffen_laenge/2 + 4), 0, 0])
            rotate([0, 90, 0])
            cylinder(d=innen_durchmesser, h=muffen_laenge + 2, center=true);
        rotate([90, 0, 0])
            cylinder(d=bolzen_loch, h=gabel_breite + 2, center=true);
        translate([-(auge_durchmesser/2 + muffen_laenge/2 + 4), 0, aussen_durchmesser/2])
            cylinder(d=loch_durchmesser_rohr, h=wanddicke + 5, center=true);
    }
}
