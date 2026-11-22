/*
 * ENTWURF: Aufklipsbarer Kabelclip
 * Funktion: Schnapp-Clip für Rohre mit seitlicher Kabelöse (z. B. für 6-8 mm Kabel).
 */

$fn = 100;

rohr_nennmass = 40.0;
toleranz = 0.15;
innen_durchmesser = rohr_nennmass + toleranz;
wanddicke = 3.0;
aussen_durchmesser = innen_durchmesser + (wanddicke * 2);
clip_hoehe = 15.0;
oeffnung_breite = rohr_nennmass * 0.78;

kabel_durchmesser = 7.5;
kabel_wand = 2.5;
kabel_aussen = kabel_durchmesser + (kabel_wand * 2);

kabelclip();

module kabelclip() {
    difference() {
        union() {
            // Rohr-Clip
            cylinder(d=aussen_durchmesser, h=clip_hoehe, center=true);
            // Kabel-Öse auf +X
            translate([(aussen_durchmesser/2) + (kabel_aussen/2) - 1.5, 0, 0])
                cylinder(d=kabel_aussen, h=clip_hoehe, center=true);
        }
        // Rohr-Innenbohrung & Öffnung
        cylinder(d=innen_durchmesser, h=clip_hoehe + 2, center=true);
        translate([-aussen_durchmesser/2, 0, 0])
            cube([aussen_durchmesser, oeffnung_breite, clip_hoehe + 2], center=true);

        // Kabel-Innenbohrung & schmaler Einführschlitz
        translate([(aussen_durchmesser/2) + (kabel_aussen/2) - 1.5, 0, 0]) {
            cylinder(d=kabel_durchmesser, h=clip_hoehe + 2, center=true);
            translate([kabel_aussen/2, 0, 0])
                cube([kabel_aussen, kabel_durchmesser * 0.65, clip_hoehe + 2], center=true);
        }
    }
}
