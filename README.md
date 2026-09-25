<p align="center">
  <img src="public/favicon.svg" width="72" alt="HackNexus" />
</p>

<h1 align="center">⚔️ HackNexus</h1>

<p align="center">
  <strong>Suite de hacking ético, ciberseguridad y forense — 100% client-side</strong><br/>
  <span font-mono>57 herramientas · docs detalladas · comparativa de OS · sin backend · tus datos nunca salen del navegador</span>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-2ee88a?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/tools-57-2ee88a?style=flat-square" alt="57 tools" />
  <img src="https://img.shields.io/badge/backend-0-blueviolet?style=flat-square" alt="0 backend" />
  <img src="https://img.shields.io/badge/React%2018-Vite%205-61dafb?style=flat-square" alt="React 18 + Vite 5" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square" alt="TS strict" />
</p>

---

## 🧭 Qué es

HackNexus es una **caja de herramientas ofensivas y defensivas** que corre enteramente en tu navegador: hashing y cracking con rockyou, esteganografía LSB, análisis de PCAP, generación de reverse shells, subnetting/VLSM, JWT, CVSS, OSINT de metadatos… todo con estética de terminal premium y sin enviar un solo byte a servidores propios.

> **⚠️ Aviso:** Las tools de red (DNS, IP Info, HTTP, Ping, CVE) consultan **APIs públicas de terceros** (dns.google, ipwho.is, NVD). Todo lo demás funciona **offline total** — ver tabla.

## 🚀 Deploy / desarrollo

```bash
git clone https://github.com/D1se0/hacknexus
cd hacknexus
npm install
npm run dev        # http://localhost:5173
npm run build      # producción → dist/
npm run preview
```

El deploy a **GitHub Pages** es automático: cada push a `main` ejecuta [.github/workflows/pages.yml](.github/workflows/pages.yml) (build + deploy). Configura en *Settings → Pages → Source: GitHub Actions*.

## 🧰 Las 57 herramientas

### Criptografía
| Tool | Descripción | Red |
|---|---|---|
| **Hash Suite** | MD5, SHA-1/256/384/512, SHA3-512, RIPEMD-160, CRC32, NTLM, HMAC + hashes de archivos | 🟢 local |
| **Hash Cracker** | Cracking con rockyou.txt (10k/100k/1M vía CDN) y reglas, en Web Worker con estadísticas | 🟡 CDN dicts |
| **HashID** | Identifica formatos de hash, sugiere modo hashcat `-m` y formato John | 🟢 local |
| **AES & Fernet** | AES-256-GCM con PBKDF2 (100k iteraciones), envelope JSON autenticado | 🟢 local |
| **JWT Toolkit** | Decodifica, verifica HS*, genera tokens sin firma (alg=none), **crackea secrets con diccionario subido** (SHA-2 nativo, millones/s) y firma tokens propios | 🟢 local |
| **TOTP Generator** | Códigos 2FA en vivo estilo Authenticator con QR y múltiples cuentas | 🟢 local |
| **HackingChef** 🔥 port | Cadenas de codificación/cifrado con resultado en vivo (estilo CyberChef) | 🟢 local |
| **Multi-Encoders** | Base16/32/58/62/64/85, hex, bin, octal, morse, URL, HTML, Unicode | 🟢 local |
| **Emoji & ZW Encoder** | Codifica mensajes en emojis y texto invisible zero-width | 🟢 local |
| **Cifrados Clásicos** | César/ROT13/ROT47, Vigenère, Atbash, XOR + criptoanálisis automático por frecuencias | 🟢 local |

### Contraseñas
| Tool | Descripción | Red |
|---|---|---|
| **Generador de Contraseñas** | Passwords, passphrases y PINs con crypto.getRandomValues sin sesgo | 🟢 local |
| **Auditor de Contraseñas** | Fortaleza zxcvbn, tiempo de crackeo offline y filtraciones HIBP (k-anonymity: solo 5 chars del SHA-1) | 🟡 HIBP |

### Web & payloads
| Tool | Descripción | Red |
|---|---|---|
| **Reverse Shells** 🔥 port | 36 shells (bash, python, powershell, nc, php…) con IP/puerto y listeners listos | 🟢 local |
| **PHP Security Scanner** 🔥 port | Detecta funciones peligrosas, analiza disable_functions, referencia de 100+ funciones | 🟢 local |
| **SQL & CSV Generator** 🔥 port | CREATE/INSERT, datos fake en CSV y diagramas ER en Mermaid | 🟢 local |
| **Payload Arsenal** | SQLi por motor, XSS evasión, SSRF (cloud metadata), LFI/php://filters, wordlists de fuzzing | 🟢 local |
| **HTTP Request Builder** | Peticiones raw estilo netcat/Burp con cookies, auth y export a curl | 🟢 local |
| **Web Fuzzer** | Fuzzing concurrente de rutas con códigos, tamaño, words/lines y detección de 401/403 | 🟡 target |

### Red
| Tool | Descripción | Red |
|---|---|---|
| **DNS Lookup (DoH)** | A/AAAA/MX/NS/TXT/CAA/SOA vía DNS-over-HTTPS + análisis SPF/DKIM/DMARC | 🔵 dns.google |
| **IP Info & GeoIP** | Geolocalización, ASN, ISP, tipo de red + link a OpenStreetMap | 🔵 ipwho.is |
| **HTTP Inspector** | Auditoría de cabeceras de seguridad (HSTS, CSP, XFO…) con explicaciones | 🔵 target |
| **Ping & Latencia web** | RTT HTTP real desde el navegador, min/avg/max con gráfica animada | 🔵 target |
| **Subnetting Calculator** 🔥 port | IPv4/CIDR completa: binarios, clase, wildcard, tabla de referencia clicable | 🟢 local |
| **Calculadora VLSM** 🔥 port | Segmenta por hosts con mapa visual proporcional, binarios por subred, eficiencia, huecos libres, detalle expandible y export CSV | 🟢 local |
| **IPv4 Generator** | Genera IPs aleatorias criptográficas por tipo (privada, pública, multicast…) con análisis de subred por dirección | 🟢 local |
| **IPv6 Toolkit** | Expande/comprime, tipo, prefijos, EUI-64, reverse ip6.arpa y **generador de MACs** por fabricante | 🟢 local |
| **Curl Builder** | Construye curl con headers, auth, proxy y equivalente Python requests | 🟢 local |
| **WiFi Map** | Mapa global comunitario de WiFi compartidos: **~130 redes demo procedurales** (regeneradas por sesión), clusters por zoom, claves, lugares, geolocalización y export JSON | 🔵 tiles Esri |

### Forense
| Tool | Descripción | Red |
|---|---|---|
| **PCAP Analyzer** | Parsea pcap/pcapng (big/little endian): protocolos, top talkers, DNS/HTTP, alertas C2/Telnet/NTLM | 🟢 local |
| **File Analyzer** | Magic bytes de 25+ formatos, entropía de Shannon por bloques, strings, hashes | 🟢 local |
| **EXIF & Metadatos** | GPS, cámara, software y comentarios de JPG/PNG/HEIC/TIFF/PDF con aviso de ubicación | 🟢 local |
| **Esteganografía LSB** | Oculta/extrae mensajes en el bit menos significativo de píxeles PNG (canvas) | 🟢 local |
| **Log Forensics** | auth.log/syslog y EVTX-XML: fuerza bruta, top IPs, usuarios, histograma horario, eventos sospechosos (sudo peligroso, 4720, 1102…) y export JSON | 🟢 local |
| **File Carver** | Carving por magic bytes: recupera PNG/JPG/GIF/PDF/ZIP/RAR/7z/GZIP embebidos en dumps, con preview, SHA-256 y búsqueda ASCII/UTF-16 | 🟢 local |

### Ingeniería Inversa
| Tool | Descripción | Red |
|---|---|---|
| **Binary Inspector** | Parsea PE/ELF: headers, secciones con entropía, imports por DLL, exports, packers (UPX/entropía), Go/Rust/.NET y anti-debug — sin ejecutar nada | 🟢 local |
| **Deobfuscator** | Descodificación multi-capa automática (hex→base64→URL→escapes…), crackeo XOR single-byte por frecuencia, ROT-N y métricas de ofuscación JS | 🟢 local |

### Phishing
| Tool | Descripción | Red |
|---|---|---|
| **Email Header Analyzer** | Cadena Received, SPF/DKIM/DMARC, Return-Path vs From vs Reply-To, X-Mailer de scripts y score de spoofing 0-100 | 🟢 local |
| **URL Phishing Inspector** | Punycode/homoglyphs carácter a carácter, typosquatting de marcas, acortadores, credenciales en URL y risk score — sin visitar la URL | 🟢 local |
| **Awareness Campaign Builder** | Plantillas de email y landings de entrenamiento (BEC, O365, DHL, quishing, pretexting) con disclaimers, tracking simulado y QR | 🟢 local |

### Linux & sistema
| Tool | Descripción | Red |
|---|---|---|
| **Calculadora CHMOD** 🔥 port | Octal/simbólico con SUID, SGID, Sticky, presets y comando listo | 🟢 local |
| **Linux/Windows Cheatsheets** | **~530 comandos**: Linux (21 cat), Windows/AD (12), macOS, redes, checklist de privesc, equivalencias y one-liners de reverse shells — con buscador | 🟢 local |
| **Generador Umask** | Permisos reales que produce cada máscara sobre ficheros/directorios, presets y veredicto de seguridad | 🟢 local |
| **Generador Sudoers** | Reglas de sudoers.d con análisis automático: GTFOBins, wildcards, rutas relativas y NOPASSWD peligrosos | 🟢 local |
| **Generador systemd** | Units service (con bloque de hardening), timer con OnCalendar y mount + comandos de activación | 🟢 local |
| **Permisos NTFS (icacls)** | Generador de icacls con ACEs visuales, herencias, presets y equivalencias chmod ↔ icacls | 🟢 local |

### Análisis
| Tool | Descripción | Red |
|---|---|---|
| **CVE Lookup** | Consulta la NVD con CVSS, descripción, estado y referencias clicables | 🔵 NVD/NIST |
| **Calculadora CVSS 3.1** | Puntuación base oficial de FIRST con vector, severidad y ejemplos (Log4Shell…) | 🟢 local |
| **Cron Guru** | Explica expresiones cron y calcula próximas 5 ejecuciones en tu zona horaria | 🟢 local |
| **Regex Lab** | Resaltado en vivo, grupos captura/nombrados, patrones OSINT (AWS keys, JWT, tarjetas…) | 🟢 local |
| **Defanger / Refanger** | Neutraliza o restaura IPs, dominios, URLs y emails para compartir IOCs | 🟢 local |
| **UUID & IDs** | UUID v4, NanoID, ObjectId y ULID + validador/decodificador con timestamps | 🟢 local |
| **MITRE ATT&CK Navigator** | Matriz enterprise filtrable por táctica/ID, marca cobertura de tu ejercicio y exporta capa JSON para el Navigator oficial | 🟢 local |
| **Windows Event IDs** | Qué significa cada evento del log Security/System y cómo convertirlo en detección (queries PS incluidas) | 🟢 local |
| **Ports & Services** | ~65 puertos con ángulo de pentest, grupos (web/AD/db…) y notas de escaneo | 🟢 local |

### Generadores
| Tool | Descripción | Red |
|---|---|---|
| **QR Generator** | Códigos QR con presets WiFi, vCard, email, SMS, tel y geo; corrección de error L/M/Q/H, colores y descarga PNG/SVG en local | 🟢 local |
| **Lorem Ipsum Generator** | Texto de relleno por párrafos/frases/palabras, salida MD/HTML/JSON y modo hacker para demos | 🟢 local |
| **Dork Arsenal** | ~35 dorks de Google, Bing, GitHub, Shodan y Censys con sustitución de objetivo y apertura directa | 🟢 local |

🔥 **port** = portada de uno de mis repos originales: [chmod-calculator](https://github.com/D1se0/chmod-calculator) · [revShellsGenerator](https://github.com/D1se0/revShellsGenerator-page) · [PHPDetector](https://github.com/D1se0/PHPDetector-page) · [hackingChef](https://github.com/D1se0/hackingChef-page) · [calculadora_vlsm](https://github.com/D1se0/calculadora_vlsm) · [calculadora_subnetting](https://github.com/D1se0/calculadora_subnetting) · [sql-generator](https://github.com/D1se0/sql-generator)

## 📚 Docs y comparativa de OS

Además de las herramientas, la suite incluye dos secciones de conocimiento:

- **[Documentación](https://d1se0.github.io/hacknexus/#/docs)** — cada herramienta con una ficha ultradetallada: qué hace exactamente, parámetros y entradas, usos reales del día a día, aplicaciones en hacking ético y tips. Con buscador global.
- **[Comparativa de OS de hacking ético](https://d1se0.github.io/hacknexus/#/os-compare)** — Kali, Arch (+BlackArch), Parrot, Ubuntu, Windows Server/AD, RHEL, Tails, Qubes y más: estadísticas animadas, pros/contras, veredicto honesto, ruta de aprendizaje recomendada y **repos de entornos customizados**, incluidos los del autor:
  - [kali-environment-install](https://github.com/D1se0/kali-environment-install) · [environment-kali-nordic](https://github.com/D1se0/environment-kali-nordic) · [guía del entorno Kali](https://d1se0.github.io/blog_hacking/view.html?enviroment=kalilinux)
  - [Arch_i3_d1se0_Environment](https://github.com/D1se0/Arch_i3_d1se0_Environment) · [environment-ubuntu-installer](https://github.com/D1se0/environment-ubuntu-installer)

## 🔐 Privacidad

- **🟢 local** — computación 100% en tu navegador. Los archivos (PCAP, imágenes, EXIF) **nunca se suben**.
- **🔵 API pública** — la consulta sale a un tercero con CORS abierto (dns.google, ipwho.is, NVD). Se indica en la propia tool.
- **🟡 objetivo/CDN** — la petición va al objetivo que tú elijas, o se descarga un diccionario de SecLists vía jsDelivr.
- Sin analytics, sin cookies, sin telemetría, sin backend propio. El código es auditable.

## ⚖️ Uso ético

HackNexus es una herramienta para **pentesting autorizado, CTFs, laboratorios y aprendizaje**. Usarla contra sistemas sin permiso explícito es **ilegal**. El autor no se responsabiliza del mal uso.consulta siempre la legislación de tu jurisdicción.

## 🛠️ Stack

- **React 18 + TypeScript strict + Vite 5**
- **Tailwind CSS** con paleta terminal personalizada (`#0b0f0d` / `#2ee88a`)
- **framer-motion** para animaciones, Web Workers para cracking pesado
- **WebCrypto** nativo para AES/HMAC/PBKDF2, **exifr** para metadatos
- Lazy-loading por tool (cada una es un chunk independiente)

## 📄 Licencia

MIT — ver [LICENSE](LICENSE). Las wordlists de SecLists tienen su propia licencia (-uso educativo).
