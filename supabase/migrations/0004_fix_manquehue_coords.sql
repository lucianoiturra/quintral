-- Corrige las coordenadas de los 6 puntos sembrados para Cerro Manquehue.
-- Las coordenadas anteriores quedaron en otra zona de Santiago (~-33.21, -70.34);
-- estas nuevas provienen de mediciones GPS reales en terreno (Vitacura / Lo Barnechea).

update observaciones set lat = -33.3581, lng = -70.5711
  where cerro = 'Manquehue' and lat = -33.2129 and lng = -70.3416;

update observaciones set lat = -33.3569, lng = -70.5717
  where cerro = 'Manquehue' and lat = -33.2125 and lng = -70.3418;

update observaciones set lat = -33.3567, lng = -70.5711
  where cerro = 'Manquehue' and lat = -33.2124 and lng = -70.3416;

update observaciones set lat = -33.3558, lng = -70.5719
  where cerro = 'Manquehue' and lat = -33.2121 and lng = -70.3419;

update observaciones set lat = -33.3547, lng = -70.5739
  where cerro = 'Manquehue' and lat = -33.2117 and lng = -70.3426;

update observaciones set lat = -33.3539, lng = -70.5744
  where cerro = 'Manquehue' and lat = -33.2114 and lng = -70.3428;
