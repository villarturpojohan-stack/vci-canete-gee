# VCI mensual en cultivos de Cañete

Proyecto de aprendizaje de **Johan Manuel Villar Turpo**, estudiante de Ingeniería Ambiental. Explora la condición relativa de la vegetación con MODIS en Google Earth Engine y una máscara agrícola de ESA WorldCover.

**Archivo principal: `vci_mensual.js`.** Compara marzo de 2024 con los marzos de 2001–2023. No representa un diagnóstico confirmado de sequía.

## Cómo usarlo

1. Entra a https://code.earthengine.google.com con una cuenta habilitada.
2. Copia todo `vci_mensual.js` en un script nuevo y pulsa Run.
3. En Layers, observa la vista principal de cultivos. La vista opcional de toda el área incluye terrenos sin cultivos.
4. En Tasks, ejecuta `VCI_mensual_cultivos_2024_3`. El GeoTIFF se guarda en Google Drive, carpeta `VCI_Canete`.
5. Abre el archivo en QGIS para revisar el resultado. NoData: -9999.

El cálculo interactivo puede mostrar `Earth Engine capacity exceeded`. En la prueba del autor, parte del mapa se dibujó con este aviso y posteriormente se pudo obtener la exportación. La exportación es el camino utilizado para completar esa prueba; no garantiza que cualquier ejecución futura termine sin errores.

## Método

- Área: provincia de Cañete, Lima, según GAUL 2015. No equivale a la cuenca hidrográfica ni a un límite oficial actualizado.
- NDVI MODIS MOD13Q1 v6.1, resolución nominal de 250 m, compuestos de 16 días. Factor de escala 0.0001, filtro SummaryQA=0 y rango NDVI válido.
- Para cada año se promedian los compuestos cuya fecha inicial cae en el mes seleccionado. No equivale a un promedio diario exacto. Se exige al menos una observación válida por mes y diez años de referencia válidos por píxel.
- VCI = 100 × (NDVI mensual evaluado − mínimo histórico del mismo mes) / (máximo − mínimo). Se excluye el denominador cero. Los valores fuera de 0–100 se conservan en el GeoTIFF y se agrupan en las clases extremas solo al dibujar.
- Máscara categórica sencilla: WorldCover 2021, clase 40 (cultivos). No calcula fracción agrícola por píxel. La máscara de 10 m no aumenta la resolución del NDVI; se remuestrea según la escala solicitada.
- Los parámetros se editan al inicio del script. La referencia debe ser anterior al año evaluado. Revisar también el CRS de exportación si se cambia de región (configurado en UTM 18S).

## Interpretación y limitaciones

Un VCI bajo indica menor verdor respecto a la referencia utilizada. Cosecha, manejo, cambios de cobertura o estrés pueden influir: se necesitan datos complementarios para atribuirlo a sequía. WorldCover 2021 no confirma cuáles eran los cultivos en 2024. Las zonas transparentes pueden estar fuera de la máscara o carecer de observaciones válidas suficientes.

Las clases son intervalos numéricos, no niveles de severidad de sequía validados localmente. Esta adaptación mensual no es el producto operativo VCI de FAO.

## Evidencia y versiones

- `vci_mensual.js`: versión principal con comparación estacional y filtros de calidad.
- `vci_canete.js`: reconstrucción sencilla del ejercicio previo; compara marzo de 2024 con extremos de todos los meses de 2000–2025, sin filtro QA adicional. Se conserva como antecedente, no como archivo principal.
- `evidencia/`: capturas del ejercicio original aportadas por el autor. No son resultados de la versión mensual. Se conservan sus atribuciones de mapa base.

Las variantes originales usaban la provincia o un asset personal llamado cuencaCanete. No se verificó ese asset ni cuál variante produjo cada captura. El script principal usa la provincia, coherente con la publicación original.

## Comprobaciones

Sintaxis JavaScript comprobada localmente. El 24 de noviembre de 2026 el autor confirmó haber obtenido la exportación de la versión mensual y que el resultado estaba bien. Esta es una confirmación de ejecución reportada por el autor: no constituye una auditoría independiente de los valores del GeoTIFF ni validación científica. El mapa interactivo presentó límites de capacidad durante la prueba.

## Fuentes y atribución

- [MODIS MOD13Q1 v6.1](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD13Q1).
- [ESA WorldCover project 2021](https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v200), CC BY 4.0.
- [FAO GAUL 2015](https://developers.google.com/earth-engine/datasets/catalog/FAO_GAUL_2015_level2). Consultar condiciones antes de uso comercial; aquí no se redistribuyen los límites.
- [FAO: interpretación del VCI](https://www.fao.org/giews/earthobservation/faq.jsp).
- [Earth Engine: procesamiento interactivo y exportaciones](https://developers.google.com/earth-engine/guides/processing_environments).

No se ha asignado licencia al código. Los productos y mapas de terceros conservan sus propias condiciones.
