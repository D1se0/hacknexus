# Decisiones — sección «VLSM en Formato X»

Registro cronológico de decisiones de diseño contradictorias con la plantilla o con este prompt.

1. **Columna Z con punto final**: la plantilla es inconsistente (`192.168.68` sin punto en algunos bloques, `172.30.12.` con punto en otros). En la web SIEMPRE se imprime el punto final («parcial») porque comunica que el octeto sigue por debajo. El `.xlsx` exportado usa el mismo criterio.
2. **Numeración 9–32**: la fila 1 de la plantilla solo llega a 30 (defecto 2.4). La web y el export numeran 9–32.
3. **Bits/etiquetas en el .xlsx**: los pits (1/0) y pesos se escriben como NÚMEROS (como la plantilla) y las IPs como TEXTO (defecto 2.4 no replicado: la plantilla guarda `192168255254` numérico en 2 celdas).
4. **Etiquetas con acento**: la plantilla usa `1º HOST` / `DIR RED` / `ULTIMO HOST` / `DIR BROADCAST` (sin acento en ÚLTIMO). La web muestra las mismas etiquetas (se respeta el estilo de la plantilla).
5. **/31 y /32**: la plantilla no los contempla. Reglas del prompt: /31 → 2 filas (`DIR RED/1ª DIRECCIÓN` y `2ª DIRECCIÓN`) con insignia «punto a punto (RFC 3021)»; /32 → una fila con insignia «host» (no hay red/broadcast separados).
6. **/0–/7**: la rejilla se amplía automáticamente a 32 columnas (octeto 1), con aviso visible. Control manual «Mostrar 32 bits» siempre disponible.
7. **Formatos de entrada**: se aceptan `ip/prefijo`, `ip máscara` y `ip wildcard`; `ip 27` (prefijo sin barra) se acepta CON aviso inline. Detección máscara vs wildcard por contigüidad (`cidrFromMaskInt` de subnet.ts).
8. **Modo B**: reutiliza DIRECTAMENTE el resultado de la Calculadora VLSM (los `VlsmBlock` ya calculados): no se recalculan subredes por otro camino.
9. **Export .xlsx sin dependencias**: ZIP con deflate STORE (uncompressed) escrito a mano (CRC32) + XML minimal. Verificado con openpyxl: hoja `Hoja1`, freeze A3, anchos de columna similares, bordes finos, colores del modo Excel clásico (cian `FF00CCFF` octeto 2, lila `FFE1C7E1` octeto 4, cabecera roja, pesos azules).
10. **Nombre del componente de la sección**: `VlsmXSection` en `src/tools/VlsmXSection.tsx`, incluido (no ruta dinámica) al final de Vlsm.tsx para mantener un solo chunk de la tool.
11. **Ejemplo: los 7 vectores del Excel**: el botón «Ejemplo» carga exactamente las 7 entradas de 2.3 en modo A. Es la prueba visual de fidelidad.
12. **Tests**: sin runner en repo → batería `node` + esbuild (`scripts/test-vlsmx.mjs`) contra fixtures generadas por un oráculo Python independiente (`scripts/gen-fixtures-vlsmx.py` con `ipaddress`; `openpyxl` solo para leer el .xlsx de la plantilla como golden, almacenada en `docs/fixtures/Formato_en_X.xlsx`).
13. **Ancho de columnas del export**: la plantilla tiene anchos raros (A=3.0, D=2.8, Y=17.9, Z=15.2); la web exporta anchos UNIFORMES de 3.0 para bits, 17.9 en Y y 15.2 en Z (los anchos de la plantilla parecen accidentes de escritura, no diseño).
14. **localStorage para estilo**: la tool Personalización del repo usa su propio sistema; para la preferencia de rejilla (`hacknexus` vs `excel`) se usa `localStorage['vlsmx.style']` simple.
15. **PNG**: se dibuja con Canvas 2D propio (sin html-to-image): el mismo modelo del layout genera un render de alta resolución con fondo según tema.
16. **`ip 0.0.0.0` ambiguo**: tras una IP, `0.0.0.0` puede ser máscara /0 o wildcard /32. Se desambigua como MÁSCARA /0 (coincide con la semántica de red completa y con el orden de la especificación: máscara antes que wildcard). Documentado en el test `formatos aceptados`.
17. **/31 y /32 en forma canónica**: el motor devuelve SIEMPRE 2 filas en /31 (`red/1ª`, `2ª`) y 1 fila en /32, aunque el oráculo inicial generaba 4 filas con celdas repetidas; el oráculo se alineó a la forma canónica (misma información, menos filas). Los bits de host de /31 son `0` y `1` (la X marca el bit 32).
18. **`xBit` en /32 = 32**: la X se dibuja en la última columna (bit 32, col 8 del octeto 4), no «después» de la rejilla; el oráculo inicial calculaba `xCol=0`, corregido a la fórmula general `((min(prefix+1,32)−1) % 8)+1`.
