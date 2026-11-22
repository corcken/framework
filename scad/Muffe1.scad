/*
 * Modulares OpenSCAD Modell: Muffe 1 (parallele Befestigungsscheibe)
 * Eigenschaften: Durchgehende Muffe mit paralleler Befestigungsscheibe,
 * Fixierlöcher in Muffe und Scheibe.
 */

$fn = 100;

// --- PARAMETER ---
rohr_nennmass = 40.0;                         // 20, 25, 30, 40 mm
toleranz = 0.2;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = (rohr_nennmass <= 25) ? 3.5 : 4.0;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
muffen_laenge = max(25.0, rohr_nennmass);

// Scheibe (Parallel zum Rohr)
scheiben_durchmesser = rohr_nennmass + 15.0;
scheiben_dicke = 5.0;
abstand_scheibe_rohrmitte = (aussen_durchmesser / 2) + (scheiben_dicke / 2);

// Bohrungen
loch_durchmesser_scheibe = 5.2;
loch_durchmesser_muffe = (rohr_nennmass <= 25) ? 3.2 : 4.2;

// --- HAUPTBAUGRUPPE ---
rohr_verbinder();

module rohr_verbinder() {
    union() {
        rohr_muffe();
        befestigungs_scheibe();
        verbindungs_steg();
    }
}

module rohr_muffe() {
    difference() {
        cylinder(d=aussen_durchmesser, h=muffen_laenge, center=true);
        cylinder(d=innen_durchmesser, h=muffen_laenge + 2, center=true);
        translate([-aussen_durchmesser/2, 0, 0])
            rotate([0, 90, 0])
            cylinder(d=loch_durchmesser_muffe, h=wanddicke + 5, center=true);
    }
}

module befestigungs_scheibe() {
    translate([abstand_scheibe_rohrmitte, 0, 0]) {
        difference() {
            rotate([0, 90, 0])
                cylinder(d=scheiben_durchmesser, h=scheiben_dicke, center=true);
            rotate([0, 90, 0])
                cylinder(d=loch_durchmesser_scheibe, h=scheiben_dicke + 2, center=true);
        }
    }
}

module verbindungs_steg() {
    difference() {
        translate([abstand_scheibe_rohrmitte - (scheiben_dicke/2) - (wanddicke/2), 0, 0])
            cube([wanddicke + 2, aussen_durchmesser * 0.7, muffen_laenge], center=true);
        cylinder(d=innen_durchmesser, h=muffen_laenge + 2, center=true);
        translate([abstand_scheibe_rohrmitte, 0, 0])
            difference() {
                cube([scheiben_dicke + 2, scheiben_durchmesser + 10, muffen_laenge + 10], center=true);
                rotate([0, 90, 0])
                    cylinder(d=scheiben_durchmesser, h=scheiben_dicke + 2, center=true);
            }
    }
}
