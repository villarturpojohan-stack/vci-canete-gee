// VCI exploratorio en cultivos: provincia de Cañete, Perú.
// Pegar TODO en el editor JavaScript de https://code.earthengine.google.com/
// Versión revisada; no reproduce exactamente las imágenes originales.

// CONFIGURACIÓN: cambia aquí las fechas y el área para otro ejercicio.
var config = {
  departamento: 'Lima',
  provincia: 'Cañete',
  assetOpcional: '', // Si usas un asset, debe ser accesible para tu cuenta.
  anio: 2024,
  mes: 3,
  inicioHistorico: 2001,
  finHistorico: 2023,
  minimoAniosValidos: 10,
  minimoObservacionesMes: 1,
  carpetaDrive: 'VCI_Canete'
};
if (config.mes < 1 || config.mes > 12 || config.mes % 1 !== 0 ||
    config.inicioHistorico < 2001 || config.finHistorico >= config.anio ||
    config.inicioHistorico > config.finHistorico ||
    config.minimoAniosValidos < 1 ||
    config.minimoAniosValidos > config.finHistorico - config.inicioHistorico + 1 ||
    config.minimoObservacionesMes < 1) {
  throw new Error('Revisa la configuración: mes, años anteriores y umbrales.');
}

var provincias = ee.FeatureCollection('FAO/GAUL/2015/level2')
  .filter(ee.Filter.eq('ADM0_NAME', 'Peru'))
  .filter(ee.Filter.eq('ADM1_NAME', config.departamento));
var area = config.assetOpcional ? ee.FeatureCollection(config.assetOpcional) :
  provincias.filter(ee.Filter.eq('ADM2_NAME', config.provincia));

// Primero comprobar el límite: no se crean tareas con geometría vacía.
area.size().evaluate(function(n, error) {
  if (error || !n) {
    print('No se pudo cargar el área. Revisa nombres o permisos del asset.', error);
    print('Provincias disponibles:', provincias.aggregate_array('ADM2_NAME'));
    return;
  }
  ejecutar();
});

function ejecutar() {
  Map.clear();
  Map.setOptions('TERRAIN');
  Map.centerObject(area, 9);
  var fuente = ee.ImageCollection('MODIS/061/MOD13Q1').filterBounds(area);
  var rejilla = ee.Image(fuente.first()).select('NDVI').projection();
  var serie = fuente.filterDate(config.inicioHistorico + '-01-01',
    (config.anio + 1) + '-01-01').map(function(img) {
    var raw = img.select('NDVI');
    var valido = img.select('SummaryQA').eq(0)
      .and(raw.gte(-2000)).and(raw.lte(10000));
    return raw.multiply(0.0001).updateMask(valido).rename('NDVI').toFloat()
      .copyProperties(img, ['system:time_start']);
  });

  // Promedio de compuestos cuyo inicio cae en el mes elegido.
  // No equivale a un promedio de observaciones diarias del mes.
  function mensual(anio) {
    var inicio = ee.Date.fromYMD(anio, config.mes, 1);
    var coleccion = serie.filterDate(inicio, inicio.advance(1, 'month'));
    var vacia = ee.Image.constant(0).rename('NDVI')
      .updateMask(ee.Image.constant(0)).toFloat()
      .setDefaultProjection(rejilla);
    var segura = ee.ImageCollection.fromImages([vacia]).merge(coleccion);
    return segura.mean().setDefaultProjection(rejilla)
      .updateMask(segura.count().gte(config.minimoObservacionesMes))
      .set('anio', anio);
  }
  var historico = ee.ImageCollection.fromImages(
    ee.List.sequence(config.inicioHistorico, config.finHistorico).map(mensual));
  var minimo = historico.min().setDefaultProjection(rejilla);
  var rango = historico.max().subtract(minimo).setDefaultProjection(rejilla);
  var aniosValidos = historico.count().setDefaultProjection(rejilla);
  var actual = mensual(config.anio);
  var vci = actual.subtract(minimo).divide(rango.updateMask(rango.gt(0)))
    .multiply(100).rename('VCI').setDefaultProjection(rejilla)
    .updateMask(aniosValidos.gte(config.minimoAniosValidos))
    .clipToCollection(area);

  // Máscara categórica sencilla: conserva la comparación mensual y QA.
  // No calcula porcentaje de cultivo por píxel ni fuerza reproject().
  // WorldCover es de 2021 y no aumenta la resolución del NDVI MODIS.
  var cobertura = ee.ImageCollection('ESA/WorldCover/v200').first().select('Map');
  var cultivos = cobertura.eq(40);
  var vciAgricola = vci.updateMask(cultivos);

  // Clases explícitas. Etiquetas numéricas, sin diagnóstico de sequía.
  // Extremos <0 y >100 se conservan en VCI; solo se agrupan para dibujar.
  var limites = [10, 20, 30, 40, 50, 60, 80];
  var colores = ['8B0000', 'FF0000', 'FFA500', 'FFFF00',
    'ADFF2F', '90EE90', '32CD32', '006400'];
  var etiquetas = ['VCI < 10', '10 ≤ VCI < 20', '20 ≤ VCI < 30',
    '30 ≤ VCI < 40', '40 ≤ VCI < 50', '50 ≤ VCI < 60',
    '60 ≤ VCI < 80', 'VCI ≥ 80'];
  var clases = vci.multiply(0).toByte();
  limites.forEach(function(limite) { clases = clases.add(vci.gte(limite)); });
  var estilo = {min: 0, max: 7, palette: colores};
  Map.addLayer(clases, estilo,
    'Comparación: todas las coberturas (NO significa cultivos)', false);
  Map.addLayer(clases.updateMask(cultivos), estilo, 'VCI en cultivos — vista principal');

  Map.addLayer(aniosValidos.clipToCollection(area), {min: 0,
    max: config.finHistorico - config.inicioHistorico + 1}, 'Años válidos', false);
  Map.addLayer(area.style({color: '222222', fillColor: '00000000', width: 2}), {}, 'Límite');
  var panel = ui.Panel({style: {position: 'bottom-left', padding: '10px', width: '280px'}});
  panel.add(ui.Label('VCI · ' + config.anio + '-' + config.mes,
    {fontWeight: 'bold'}));
  panel.add(ui.Label('Referencia: mismo mes, ' + config.inicioHistorico + '–' + config.finHistorico));
  etiquetas.forEach(function(texto, i) {
    panel.add(ui.Panel([
      ui.Label('', {backgroundColor: '#' + colores[i], padding: '8px', margin: '2px 6px 2px 0'}),
      ui.Label(texto)
    ], ui.Panel.Layout.Flow('horizontal')));
  });
  panel.add(ui.Label('Condición relativa del verdor; no confirma sequía.'));
  panel.add(ui.Label('Sin color: fuera de máscara O sin observaciones válidas suficientes.'));
  Map.add(panel);
  print('Configuración utilizada:', config);
  print('Los colores corresponden a intervalos del VCI, no a niveles de sequía validados.');
  print('Tareas en Tasks: ejecutar manualmente para descargar. NoData = -9999.');
  Export.image.toDrive({image: vciAgricola.toFloat().unmask(-9999),
    description: 'VCI_mensual_cultivos_' + config.anio + '_' + config.mes,
    folder: config.carpetaDrive, region: area.geometry(),
    crs: 'EPSG:32718', scale: 250, maxPixels: 1e9,
    fileFormat: 'GeoTIFF', formatOptions: {noData: -9999}});
}


