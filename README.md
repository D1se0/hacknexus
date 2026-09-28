<p align="center">
  <img src="public/favicon.svg" width="72" alt="HackNexus" />
</p>

<h1 align="center">⚔️ HackNexus</h1>

<p align="center">
  <strong>Suite de hacking ético, ciberseguridad y forense — 100% client-side</strong><br/>
  <span font-mono>160 herramientas · docs detalladas · comparativa de OS · sin backend · tus datos nunca salen del navegador</span>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-2ee88a?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/tools-160-2ee88a?style=flat-square" alt="160 tools" />
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

## 🧰 Las 160 herramientas

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
| **Hash Visual Fingerprint** | Convierte cualquier hash en un identicon determinista y compara dos de un vistazo con % de similitud (efecto avalancha hecho imagen) | 🟢 local |
| **Classical Cipher Breaker** | Caesar por chi-cuadrado, Vigenère por Kasiski e IC, sustitución por hill-climbing, XOR por fuerza bruta: criptoanálisis real ES/EN | 🟢 local |
| **Asymmetric Crypto Playground** | Diffie-Hellman y RSA ejecutándose con BigInt, factorización real de n pequeño y modpow paso a paso | 🟢 local |
| **BIP39 Seed Lab** | Mnemonics reales interoperables: generar, validar checksum, anatomía bit a bit, reparar por fuerza bruta y seed PBKDF2 | 🟢 local |
| **X.509 Decoder** | Pega un PEM y desglosa SAN, EKU, keyUsage y BasicConstraints con flags de sospecha: CA:TRUE inesperada, SHA1, wildcards, auto-firmados | 🟢 local |

### Contraseñas
| Tool | Descripción | Red |
|---|---|---|
| **Generador de Contraseñas** | Passwords, passphrases y PINs con crypto.getRandomValues sin sesgo | 🟢 local |
| **Auditor de Contraseñas** | Fortaleza zxcvbn, tiempo de crackeo offline y filtraciones HIBP (k-anonymity: solo 5 chars del SHA-1) | 🟡 HIBP |
| **Password Policy Builder** | Políticas coherentes Linux/Windows según NIST 800-63B: longitud sobre complejidad, sin rotación suicida, bloqueo progresivo | 🟢 local |
| **Passphrase Forge** | Passphrases Diceware con WebCrypto, entropía real y tiempos de crackeo ante 4 adversarios (online → granja de GPUs) | 🟢 local |
| **Mask Gen** | Máscaras hashcat (?u?l?d?s) con keyspace exacto, muestras en vivo y avisos de patrones débiles | 🟢 local |
| **Password Policy Auditor** | Audita tu política contra NIST 800-63B con nota 0-100 y genera pwquality.conf + PSO de Windows coherentes | 🟢 local |

### Web & payloads
| Tool | Descripción | Red |
|---|---|---|
| **Reverse Shells** 🔥 port | 36 shells (bash, python, powershell, nc, php…) con IP/puerto y listeners listos | 🟢 local |
| **PHP Security Scanner** 🔥 port | Detecta funciones peligrosas, analiza disable_functions, referencia de 100+ funciones | 🟢 local |
| **SQL & CSV Generator** 🔥 port | CREATE/INSERT, datos fake en CSV y diagramas ER en Mermaid | 🟢 local |
| **Payload Arsenal** | SQLi por motor, XSS evasión, SSRF (cloud metadata), LFI/php://filters, wordlists de fuzzing | 🟢 local |
| **HTTP Request Builder** | Peticiones raw estilo netcat/Burp con cookies, auth y export a curl | 🟢 local |
| **Web Fuzzer** | Fuzzing concurrente de rutas con códigos, tamaño, words/lines y detección de 401/403 | 🟡 target |
| **XSS Payload Generator** | 26 payloads por vector y contexto (HTML, atributo, JS, URL) con encoding y guía de caza de inyecciones | 🟢 local |
| **XML & XXE Arsenal** | Plantillas XXE directo, OOB con evil.dtd, vía error, XInclude y XSLT hasta RCE con detección de parsers | 🟢 local |
| **PHP Filter Chain** | LFI a RCE sin subir ficheros: cadenas php://filter con iconv que sintetizan tu código (algoritmo Synacktiv) | 🟢 local |
| **Buffer Overflow Calc** | Patrón cíclico estilo Metasploit, offset desde EIP, badchars y payload con NOP sled + shellcode + retorno | 🟢 local |
| **TTY Upgrade** | De reverse shell tonta a terminal interactiva: python pty, script, socat, rlwrap con pasos y troubleshooting | 🟢 local |
| **File Transfer Arsenal** | 14 métodos de transferencia atacante↔víctima con comandos exactos: HTTP, nc, scp, certutil, PowerShell, SMB… | 🟢 local |
| **DuckyScript Builder** | Compón payloads badUSB por bloques para Rubber Ducky y Flipper Zero: presets didácticos reversibles, suplantación VID/PID y avisos de compatibilidad | 🟢 local |
| **Cron/AT Persistence Lab** | Simulador de persistencia T1053 para tu lab: genera la tarea, su rollback y las detecciones que la cazan (Sigma, YARA, hunting) | 🟢 local |
| **GraphQL Lab** | Builder de operaciones con plantillas de ataque (introspección, IDOR, SQLi/NoSQLi, alias storm, DoS), traductor query ↔ JSON para POST y trucos de batching | 🟢 local |
| **Command Injection Forge** | Payloads por SO y objetivo: ejecución visible, ciego time-based, OOB por DNS, lectura de ficheros y reverse shells de lab con su detección | 🟢 local |
| **Path Traversal Forge** | Traversals por SO, profundidad y codificación (url, double, overlong, mixto): targets valiosos, contextos y qué te dice cada respuesta | 🟢 local |
| **NoSQL Injection Forge** | Operadores Mongo ($ne, $gt, $regex, $where) y array smuggling urlencoded en JSON y URL listos para lanzar, con criterio de confirmación | 🟢 local |
| **Deserialization Arsenal** | Deserialización insegura por lenguaje (PHP, pickle, Java, .NET, Node) con gadgets, magic bytes para detectar el formato y sondas OOB | 🟢 local |
| **OAuth 2.0 / OIDC Lab** | Generador de flujos con PKCE real (WebCrypto), parser del callback con token exchange y 7 ataques: state, redirect_uri, mix-up, scopes | 🟢 local |
| **WebSocket Attack Lab** | Decodificador de frames RFC 6455 bit a bit con demo de máscara, generador de cliente/CSWSH y matriz de ataques | 🟢 local |
| **Clickjacking Forge** | PoC con preview en vivo: iframe invisible alineado por offsets y opacidad, 6 variantes del ataque y cómo auditar la defensa | 🟢 local |
| **Cache Poisoning & Deception** | Envenena la caché (headers sin clave, fat GET, header hiding) y engáñala para que guarde datos autenticados: curl PoC y metodología | 🟢 local |
| **Information Disclosure Hunter** | 12 vectores de fuga (.git, .env, actuator, source maps, CORS, buckets) priorizados por impacto con script de reconocimiento | 🟢 local |
| **Prototype Pollution Lab** | Sondas por vector (query, JSON, constructor) y sinks que convierten la polución en XSS o RCE: NODE_OPTIONS, innerHTML, bypass de filtros | 🟢 local |
| **HTTP Request Smuggler** | Peticiones desincronizadas CL.TE/TE.CL/TE.TE byte a byte con quién interpreta qué, loop de detección y defensas | 🟢 local |
| **2FA / OTP Lab** | TOTP vivo con QR para tu laboratorio, recovery codes con entropía real, 8 debilidades del segundo factor y brute force single-packet | 🟢 local |
| **Business Logic Hunter** | 8 patrones con su prueba (precios negativos, races, saltos de flujo, reembolsos) y checklist de hunting por dominio | 🟢 local |
| **JWK Set Inspector** | Analiza la postura de un JWKS: kty/alg/use, módulo RSA, claves privadas filtradas, RSA1_5 roto, rotación dormida y hunting por kid | 🟢 local |

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
| **WiFi Map** | Mapa con la **base de datos real de WiGLE** (1.000M+ redes observadas por la comunidad) con tus credenciales guardadas solo en tu navegador, más el mapa local: ~130 redes demo procedurales, tus puntos persistentes, clusters, geolocalización y export CSV/JSON | 🔵 tiles Esri + API WiGLE |
| **Pivot Map** | Mapa interactivo de pivoting: nodos arrastrables, enlaces por protocolo (ssh/chisel/ligolo/socat/plink/sshuttle), ruta por BFS y los comandos exactos por tramo | 🟢 local |
| **Network Admin Calc** | 7 calculadoras: TTL→SO, MTU/MSS, wildcards ACL Cisco, plan de VLANs, ToS/DSCP, transferencias y CIDR | 🟢 local |
| **Network Topology Designer** | Diseña topologías arrastrando nodos (13 tipos) y enlazándolos por medio (ethernet/fibra/wifi/vpn), con análisis de huérfanos/duplicados, BOM de materiales y export PNG/JSON | 🟢 local |
| **Cable Docs Animadas** | Pinout RJ45 T568A/B con señal animada, categorías Cat5e–Cat8, tipos de cable con trampas, fibra single/multimodo y conectores LC/SC/ST/MPO | 🟢 local |
| **Internet Speed Test** | Test real de latencia, jitter, descarga y subida contra speed.cloudflare.com con velocímetro animado, nota, matriz de usos e historial | 🔵 speed.cloudflare.com |
| **Wireshark Display Filters** | Constructor visual de display filters: catálogo por protocolo, presets de caza (escaneos, exfil DNS, credenciales) y validación en vivo | 🟢 local |
| **BLE GATT Explorer** | Servicios y characteristics Bluetooth con su riesgo real (tracking, DFU sin firma), conversor UUID y decoder de advertising | 🟢 local |
| **WiFi Attack Lab** | Los 7 pasos de una auditoría 802.11 en tu laboratorio: comandos con placeholders personalizables, qué esperar en cada salida, la trampa típica y cómo se detecta cada acción | 🟢 local |
| **Decodificador 802.11** | Pega un frame en hex y desglosa la cabecera MAC bit a bit: flags, direcciones según toDS/fromDS e Information Elements con el RSN completo (WPA2/WPA3/PMF) | 🟢 local |
| **WiFi Channel Planner** | Planifica canales 2.4/5/6 GHz con el solapamiento real del espectro: mapa de congestión con tus APs vecinos, mejores canales, grupos de 80 MHz con avisos DFS y PSC de 6 GHz | 🟢 local |
| **WiFi Security Auditor** | Puntúa tu red sobre 100 (cifrado, PMF, passphrase, WPS, admin) con hardening priorizado por esfuerzo y matriz de amenazas: evil twin, karma, deauth, KRACK, Dragonblood | 🟢 local |
| **Anonymity Lab** | Diagnóstico en vivo de tu exposición (IP, fuga WebRTC real vía RTCPeerConnection, huella en bits, coherencia por país de salida) y recetas exactas para cambiar IP/MAC de verdad: macchanger, Tor NEWNYM, WireGuard con kill switch, protocolo de identidad nueva | 🔵 ipwho.is + 🟢 local |

### Forense
| Tool | Descripción | Red |
|---|---|---|
| **PCAP Analyzer** | Parsea pcap/pcapng (big/little endian): protocolos, top talkers, DNS/HTTP, alertas C2/Telnet/NTLM | 🟢 local |
| **File Analyzer** | Magic bytes de 25+ formatos, entropía de Shannon por bloques, strings, hashes | 🟢 local |
| **EXIF & Metadatos** | GPS, cámara, software y comentarios de JPG/PNG/HEIC/TIFF/PDF con aviso de ubicación | 🟢 local |
| **Zero-Width Stego** | Tinta invisible en texto: 3 modos (binario, denso, por palabra), extracción con detección de modo y sanitizer forense | 🟢 local |
| **Esteganografía LSB** | Oculta/extrae mensajes en el bit menos significativo de píxeles PNG (canvas) | 🟢 local |
| **Log Forensics** | auth.log/syslog y EVTX-XML: fuerza bruta, top IPs, usuarios, histograma horario, eventos sospechosos (sudo peligroso, 4720, 1102…) y export JSON | 🟢 local |
| **File Carver** | Carving por magic bytes: recupera PNG/JPG/GIF/PDF/ZIP/RAR/7z/GZIP embebidos en dumps, con preview, SHA-256 y búsqueda ASCII/UTF-16 | 🟢 local |
| **Stego Audio** | Esteganografía LSB sobre WAV/PCM real con parser RIFF propio, capacidad en bytes, waveform y espectrograma por FFT propia | 🟢 local |

### Ingeniería Inversa
| Tool | Descripción | Red |
|---|---|---|
| **Binary Inspector** | Parsea PE/ELF: headers, secciones con entropía, imports por DLL, exports, packers (UPX/entropía), Go/Rust/.NET y anti-debug — sin ejecutar nada | 🟢 local |
| **Deobfuscator** | Descodificación multi-capa automática (hex→base64→URL→escapes…), crackeo XOR single-byte por frecuencia, ROT-N y métricas de ofuscación JS | 🟢 local |
| **NFC / RFID Lab** | Laboratorio educativo de tarjetas de proximidad sin hardware: 8 familias de chips, UIDs y dumps simulados, Wiegand 26 bidireccional, modulaciones animadas y ataques con su defensa | 🟢 local |
| **Bytecode Inspector** | Descompilador didáctico: parsea .class de Java real (constant pool, fields, methods) y cabecera de .pyc, con strings sospechosos | 🟢 local |
| **Firmware Inspector** | Parsea imágenes ESP8266/ESP32 (header, segmentos, app description) e Intel HEX de Arduino, y extrae strings sospechosos del binario | 🟢 local |

### Phishing
| Tool | Descripción | Red |
|---|---|---|
| **Email Header Analyzer** | Cadena Received, SPF/DKIM/DMARC, Return-Path vs From vs Reply-To, X-Mailer de scripts y score de spoofing 0-100 | 🟢 local |
| **URL Phishing Inspector** | Punycode/homoglyphs carácter a carácter, typosquatting de marcas, acortadores, credenciales en URL y risk score — sin visitar la URL | 🟢 local |
| **Homoglyph Scanner** | Dominios y textos impostores: punycode decodificado, confusables cirílico/griego, invisibles y bidi, esqueleto comparador, evil twins para testear filtros y catálogo IDN | 🟢 local |
| **Awareness Campaign Builder** | Plantillas de email y landings de entrenamiento (BEC, O365, DHL, quishing, pretexting) con disclaimers, tracking simulado y QR | 🟢 local |
| **Quishing Lab** | QR phishing educativo: 4 escenarios reales, 3 estilos de QR legítimos y lecciones para entrenar el ojo del equipo | 🟢 local |
| **Shortener Audit** | Expande acortadores en vivo y detecta credenciales, punycode, typosquatting y redirects abiertos | 🟡 fetch CORS |
| **Phishing MITM Anatomy** | Anatomía del phishing con proxy inverso (Evilginx-style): por qué roba sesiones con 2FA y qué capas lo rompen | 🟢 local |

### Linux & sistema
| Tool | Descripción | Red |
|---|---|---|
| **Calculadora CHMOD** 🔥 port | Octal/simbólico con SUID, SGID, Sticky, presets y comando listo | 🟢 local |
| **Linux/Windows Cheatsheets** | **~530 comandos**: Linux (21 cat), Windows/AD (12), macOS, redes, checklist de privesc, equivalencias y one-liners de reverse shells — con buscador | 🟢 local |
| **Generador Umask** | Permisos reales que produce cada máscara sobre ficheros/directorios, presets y veredicto de seguridad | 🟢 local |
| **Generador Sudoers** | Reglas de sudoers.d con análisis automático: GTFOBins, wildcards, rutas relativas y NOPASSWD peligrosos | 🟢 local |
| **Generador systemd** | Units service (con bloque de hardening), timer con OnCalendar y mount + comandos de activación | 🟢 local |
| **Permisos NTFS (icacls)** | Generador de icacls con ACEs visuales, herencias, presets y equivalencias chmod ↔ icacls | 🟢 local |
| **Fstab Builder** | Entradas editables con presets por escenario y validador de errores clásicos (credenciales inline, suid en home, fsck en tmpfs) | 🟢 local |
| **Sysctl Hardening** | Catálogo explicado de claves del kernel con perfiles servidor/desktop/Docker y conf listo para /etc/sysctl.d | 🟢 local |
| **SSH Hardening** | sshd_config endurecido con explicación de cada directiva: solo claves, cifrados AEAD, AllowUsers y banner legal | 🟢 local |
| **NFTables Builder** | Rulesets nft con policy drop, established/related, rate limit SSH y presets web/home/workstation | 🟢 local |
| **WireGuard Config** | Túnel completo servidor+peers con claves WebCrypto, AllowedIPs explicado, MTU, NAT y firewall | 🟢 local |
| **Firewall Windows** | Reglas netsh advfirewall con mínimo privilegio, presets (RDP LAN, WinRM, SMB) y aviso de reglas peligrosas | 🟢 local |
| **Windows Scheduled Tasks** | schtasks + PowerShell con sección de detección: event IDs 4698-4702 y el abuso T1053.005 | 🟢 local |
| **Windows Hardening** | ~25 controles estilo CIS con justificación, aplicación, verificación y reversión (LSA, LLMNR, SMB…) | 🟢 local |
| **PowerShell Lab** | One-liners de administración, red, disco y blue team con la trampa de cada uno explicada | 🟢 local |
| **Windows Registry Tweaks** | Tweaks de telemetría/privacidad/hardening con reversión y export a .reg listo para fusionar | 🟢 local |
| **Disk & LVM Commander** | Formador de comandos de discos paso a paso: LVM (PV/VG/LV), RAID mdadm, LUKS2, dd con avisos y patrón forense, montaje y swap | 🟢 local |
| **Linux Admin Commander** | 56 comandos de administración en 8 dominios con el porqué, trampas clásicas y los de auditoría marcados | 🟢 local |
| **Bash Script Forge** | Compón scripts Bash por bloques: modo estricto, argumentos, bucles, checks de red, logging coloreado y trap de limpieza — cada pieza explicada | 🟢 local |
| **PowerShell Forge** | Igual que Bash Forge pero en PS: strict mode, param(), try/catch, transcripción y checks de red/servicios con la explicación de cada directiva | 🟢 local |

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
| **IOC Extractor** | IPs, dominios, hashes, CVEs, wallets y técnicas MITRE desde cualquier texto, con contexto y enlaces VT/AbuseIPDB | 🟢 local |
| **Log Anonymizer** | Pseudonimización consistente y reversible de IPs/usuarios/dominios para compartir logs sin exponer nada | 🟢 local |
| **Username OSINT** | URLs de perfil en ~20 plataformas, patrón del alias, variantes y dorks de Google/GitHub — todo pasivo | 🟢 local |
| **Email OSINT** | Gravatar (perfil+avatar), filtraciones (XposedOrNot), commits de GitHub firmados con ese email y dorks — pasivo con CORS verificado | 🔵 APIs públicas |
| **Phone Validator & OSINT** | Validación E.164 de 55 países + verificación EN VIVO de existencia por HLR (Veriphone/numverify) y sonda WhatsApp, con IMEI | 🟡 HLR opcional |
| **Phone Hunter** | Dossier OSINT de identidad: plan de investigación en 10 pasos, 20+ fuentes, marco legal y solicitudes ARCO/RGPD | 🔵 fuentes públicas |
| **Sysmon Config Builder** | XML de Sysmon por perfiles con guía ofensiva/defensiva de cada evento: el punto de partida de todo SOC | 🟢 local |
| **Config Diff** | Diff semántico de configs: ignora comentarios/orden, resalta directivas de seguridad que cambiaron | 🟢 local |
| **GTFOBins Explorer** | Base de datos COMPLETA de GTFOBins: 458 binarios UNIX con todos sus comandos de abuso por contexto (sudo, SUID, capabilities) | 🟢 local |
| **Usuario Generator** | Variaciones de usernames y emails corporativos con 9 convenciones y service accounts para enumeración y spraying | 🟢 local |
| **Diccionario de Acrónimos** | 196 acrónimos de ciberseguridad con definición en español organizados por dominio: de APT a YARA | 🟢 local |
| **Team Health Check** | Escaneo real de tu equipo desde el navegador (CPU, RAM, batería, red, GPU) con benchmark, desgaste estimado por antigüedad y plan de mantenimiento | 🟢 local |
| **Regex ReDOS Analyzer** | Detecta backtracking catastrófico en regex: análisis estructural + medición real del matching en worker con entradas crecientes | 🟢 local |
| **Payload Time Machine** | Museo interactivo del malware: 35 años de ataques con su impacto, técnicas MITRE que popularizó y la lección de defensa que dejó | 🟢 local |

### Lenguajes
| Tool | Descripción | Red |
|---|---|---|
| **16 CheatSheets** | Python, JavaScript, TypeScript, Java, C#, C, C++, PHP, Ruby, Go, Rust, Lua, Bash, SQL, HTML y CSS — con **playground que ejecuta el código de verdad**: Python corre en tu navegador (WASM), JS en sandbox local, el resto con compiladores reales (Wandbox); HTML/CSS con vista previa en vivo | 🟡 editor viaja |
| **Language Translator** | Traduce código entre Python, JS, TS, Java, C#, Go, Ruby y PHP: parser → IR → emisor, con % de confianza honesto e issues de lo que queda fuera del subconjunto común | 🟢 local |

### Generadores
| Tool | Descripción | Red |
|---|---|---|
| **QR Generator** | Códigos QR con presets WiFi, vCard, email, SMS, tel y geo; corrección de error L/M/Q/H, colores y descarga PNG/SVG en local | 🟢 local |
| **Lorem Ipsum Generator** | Texto de relleno por párrafos/frases/palabras, salida MD/HTML/JSON y modo hacker para demos | 🟢 local |
| **Dork Arsenal** | ~35 dorks de Google, Bing, GitHub, Shodan y Censys con sustitución de objetivo y apertura directa | 🟢 local |
| **Wordlist Builder** | Wordlists dirigidas desde datos del objetivo con las mutaciones que la gente realmente usa | 🟢 local |
| **Pentest Report Builder** | Hallazgos con severidad/evidencia/remediación y export Markdown profesional listo para pandoc | 🟢 local |
| **Chuleta Generator** | Compón chuletas de vim/tmux/find/grep/bash/red/git en TXT o Markdown listas para imprimir | 🟢 local |
| **Shell Alias Pack** | 42 alias y funciones de calidad de vida y seguridad con el hábito que corrige cada uno | 🟢 local |
| **Cron Translator** | Explica cron en cristiano, señala patrones sospechosos y convierte a systemd OnCalendar | 🟢 local |
| **Chronolog** | Timeline del engagement con fases, TTE (time-to-exploit), huecos sin documentar y export Markdown/CSV | 🟢 local |

🔥 **port** = portada de uno de mis repos originales: [chmod-calculator](https://github.com/D1se0/chmod-calculator) · [revShellsGenerator](https://github.com/D1se0/revShellsGenerator-page) · [PHPDetector](https://github.com/D1se0/PHPDetector-page) · [hackingChef](https://github.com/D1se0/hackingChef-page) · [calculadora_vlsm](https://github.com/D1se0/calculadora_vlsm) · [calculadora_subnetting](https://github.com/D1se0/calculadora_subnetting) · [sql-generator](https://github.com/D1se0/sql-generator)

## 📚 Docs y comparativa de OS

Además de las herramientas, la suite incluye varias secciones de conocimiento:

- **[Documentación](https://d1se0.github.io/hacknexus/#/docs)** — cada herramienta con una ficha ultradetallada: qué hace exactamente, parámetros y entradas, usos reales del día a día, aplicaciones en hacking ético y tips. Con buscador global.
- **[¿Qué herramienta necesito?](https://d1se0.github.io/hacknexus/#/advisor)** — orientador por necesidades: dime qué quieres conseguir (hardening, OSINT, captura, informe…) y te llevo directo a las tools adecuadas con los pasos de inicio. Para quien no se sabe el catálogo de memoria.
- **[Personalización](https://d1se0.github.io/hacknexus/#/personalization)** — cambia colores, tipografía, redondeo y efectos de TODA la suite en tiempo real: 8 temas predefinidos, paletas aleatorias, export/import del tema como JSON y análisis de contraste. Se guarda en tu navegador (Alt+T para abrirla).
- **[Comparativa de OS de hacking ético](https://d1se0.github.io/hacknexus/#/os-compare)** — Kali, Arch (+BlackArch), Parrot, Ubuntu, Windows Server/AD, RHEL, Tails, Qubes y más: estadísticas animadas, pros/contras, veredicto honesto, ruta de aprendizaje recomendada y **repos de entornos customizados**, incluidos los del autor:
  - [kali-environment-install](https://github.com/D1se0/kali-environment-install) · [environment-kali-nordic](https://github.com/D1se0/environment-kali-nordic) · [guía del entorno Kali](https://d1se0.github.io/blog_hacking/view.html?enviroment=kalilinux)
  - [Arch_i3_d1se0_Environment](https://github.com/D1se0/Arch_i3_d1se0_Environment) · [environment-ubuntu-installer](https://github.com/D1se0/environment-ubuntu-installer)

## 🔐 Privacidad

- **🟢 local** — computación 100% en tu navegador. Los archivos (PCAP, imágenes, EXIF) **nunca se suben**.
- **🔵 API pública** — la consulta sale a un tercero con CORS abierto (dns.google, ipwho.is, NVD). Se indica en la propia tool.
- **🟡 objetivo/CDN** — la petición va al objetivo que tú elijas, o se descarga un diccionario de SecLists vía jsDelivr.
- Sin analytics, sin cookies, sin telemetría, sin backend propio. El código es auditable.

## ⚖️ Uso ético

HackNexus es una herramienta para **pentesting autorizado, CTFs, laboratorios y aprendizaje**. Usarla contra sistemas sin permiso explícito es **ilegal**. El autor no se responsabiliza del mal uso — consulta siempre la legislación de tu jurisdicción.

## 🛠️ Stack

- **React 18 + TypeScript strict + Vite 5**
- **Tailwind CSS** con paleta terminal personalizada (`#0b0f0d` / `#2ee88a`)
- **framer-motion** para animaciones, Web Workers para cracking pesado
- **WebCrypto** nativo para AES/HMAC/PBKDF2, **exifr** para metadatos
- Lazy-loading por tool (cada una es un chunk independiente)

## 📄 Licencia

MIT — ver [LICENSE](LICENSE). Las wordlists de SecLists tienen su propia licencia (-uso educativo).
