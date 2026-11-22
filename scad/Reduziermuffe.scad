/*
 * ENTWURF: Reduziermuffe (z. B. 40 mm -> 30 mm)
 * Funktion: Verbindet zwei unterschiedlich dicke Rohre mit konischem Übergang.
 */

$fn = 100;

rohr_gross = 40.0;
rohr_klein = 30.0;
toleranz = 0.2;
wanddicke = 4.0;

innen_gross = rohr_gross + toleranz;
aussen_gross = innen_gross + (wanddicke * 2);
innen_klein = rohr_klein + toleranz;
aussen_klein = innen_klein + (wanddicke * 2);

muffe_gross = 35.0;
muffe_klein = 30.0;
uebergang = 18.0;
loch_durchmesser = 4.2;

reduziermuffe();

module reduziermuffe() {
    difference() {
        union() {
            // Großes Ende
            cylinder(d=aussen_gross, h=muffe_gross);
            // Konischer Übergang
            translate([0, 0, muffe_gross])
                cylinder(d1=aussen_gross, d2=aussen_klein, h=uebergang);
            // Kleines Ende
            translate([0, 0, muffe_gross + uebergang])
                cylinder(d=aussen_klein, h=muffe_klein);
        }
        // Aussparung großes Rohr
        translate([0, 0, -1])
            cylinder(d=innen_gross, h=muffe_gross + 1);
        // Durchgangsbohrung im Übergang (reduziert sich konisch)
        translate([0, 0, muffe_gross - 0.1])
            cylinder(d1=innen_gross, d2=innen_klein, h=uebergang + 0.2);
        // Aussparung kleines Rohr
        translate([0, 0, muffe_gross + uebergang])
            cylinder(d=innen_klein, h=muffe_klein + 1);

        // Fixierbohrungen
        translate([aussen_gross/2, 0, muffe_gross/2])
            rotate([0, 90, 0])
            cylinder(d=loch_durchmesser, h=wanddicke + 5, center=true);
        translate([aussen_klein/2, 0, muffe_gross + uebergang + muffe_klein/2])
            rotate([0, 90, 0])
            cylinder(d=loch_durchmesser, h=wanddicke + 5, center=true);
    }
}
