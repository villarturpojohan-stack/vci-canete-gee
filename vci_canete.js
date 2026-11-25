// VCI exploratorio — provincia de Cañete.
// Basado en el primer script aportado por Johan Manuel Villar Turpo.
// Pegar completo en un script nuevo de Google Earth Engine.
// Mantiene el método original: extremos históricos de TODOS los meses.
// No es un diagnóstico validado de sequía.

var departamento = 'Lima';
var provincia = 'Cañete';
var histInicio = '2000-01-01';
var histFin = '2026-01-01'; // Final exclusivo: incluye todo 2025.
var fechaEvalIni = '2024-03-01';
var fechaEvalFin = '2024-04-01'; // Final exclusivo: incluye todo marzo.

var provincias = ee.FeatureCollection('FAO/GAUL/2015/level2')
  .filter(ee.Filter.eq('ADM0_NAME', 'Peru'))
  .filter(ee.Filter.eq('ADM1_NAME', departamento));
var canete = provincias.filter(ee.Filter.eq('ADM2_NAME', provincia));
print('Número de áreas seleccionadas (esperado: 1):', canete.size());
print('Nombres disponibles si el filtro falla:', provincias.aggregate_array('ADM2_NAME'));
Map.centerObject(canete, 9);

var modisCol = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterBounds(canete)
  .map(function(image) {
    return image.select('NDVI').multiply(0.0001).rename('NDVI')
      .copyProperties(image, ['system:time_start']);
  });
var historico = modisCol.filterDate(histInicio, histFin);
var evaluacion = modisCol.filterDate(fechaEvalIni, fechaEvalFin);
print('Imágenes del periodo evaluado:', evaluacion.size());
var minimo = historico.min();
var rango = historico.max().subtract(minimo);
var actual = evaluacion.mean();
var vci = actual.subtract(minimo)
  .divide(rango.updateMask(rango.gt(0)))
  .multiply(100).rename('VCI').clipToCollection(canete);

// Máscara sencilla como en el ejercicio original. Sin reproject().
// Es cobertura de 2021; no confirma los cultivos presentes en 2024.
var worldCover = ee.ImageCollection('ESA/WorldCover/v200').first().select('Map');
var mascaraCultivos = worldCover.eq(40);
var vciCultivos = vci.updateMask(mascaraCultivos);

// Clases explícitas para que colores e intervalos coincidan.
// Los valores numéricos originales no se modifican en la exportación.
var limites = [10, 20, 30, 40, 50, 60, 80];
var colores = ['8B0000', 'FF0000', 'FFA500', 'FFFF00',
  'ADFF2F', '90EE90', '32CD32', '006400'];
var etiquetas = ['VCI < 10', '10 a <20', '20 a <30', '30 a <40',
  '40 a <50', '50 a <60', '60 a <80', 'VCI >= 80'];
var clases = vci.multiply(0);
limites.forEach(function(limite) {
  clases = clases.add(vci.gte(limite));
});
var estilo = {min: 0, max: 7, palette: colores};
Map.addLayer(clases, estilo, 'Área completa — incluye terrenos sin cultivos', false);
Map.addLayer(clases.updateMask(mascaraCultivos), estilo, 'VCI sobre máscara de cultivos', true);
Map.addLayer(canete.style({color: '222222', fillColor: '00000000', width: 2}), {}, 'Límite provincial');

var leyenda = ui.Panel({style: {position: 'bottom-left', padding: '8px', width: '260px'}});
leyenda.add(ui.Label('VCI exploratorio — marzo 2024', {fontWeight: 'bold'}));
leyenda.add(ui.Label('Referencia: todos los meses de 2000–2025'));
etiquetas.forEach(function(texto, i) {
  leyenda.add(ui.Panel([
    ui.Label('', {backgroundColor: '#' + colores[i], padding: '8px', margin: '2px 6px 2px 0'}),
    ui.Label(texto)
  ], ui.Panel.Layout.Flow('horizontal')));
});
leyenda.add(ui.Label('Los colores NO confirman niveles de sequía.'));
leyenda.add(ui.Label('Sin color: fuera de la máscara o sin VCI válido.'));
Map.add(leyenda);

Export.image.toDrive({
  image: vciCultivos.toFloat(),
  description: 'VCI_Canete_exploratorio',
  folder: 'VCI_Canete',
  region: canete.geometry(),
  scale: 250,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});
