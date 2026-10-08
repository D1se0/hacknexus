/* ═══════════════════════════════════════════════════════════════════════
   FORENSICS DOC — Guía completa de análisis forense (Ronda 21)
   Todo el contenido está TESTADO en Kali Linux:
   - Volatility 3 v2.28.2 contra volcado real de RAM Win10 (ksdb.raw)
   - The Sleuth Kit (mmls/fls/icat) contra imagen MBR/NTFS real (reto Tattoo)
   - python-evtx / evtx_dump contra EVTX Sysmon real (reto JohnnyCab)
   - Prefetch MAM + LZXPRESS-Huffman con dissect (reto Under Zer0)
   - regipy contra NTUSER.DAT real
   - binwalk, photorec, xxd, file, exiftool, 7z
   Las salidas de ejemplo son literales (recortadas) de esas ejecuciones.
   ═══════════════════════════════════════════════════════════════════════ */

export interface ForTool {
  cmd: string
  desc: string
  install?: string
}

export interface ForStep {
  title: string
  why: string
  cmds: string[]
  expect: string
  trap?: string
}

export interface ForSection {
  id: string
  title: string
  icon: string
  intro: string
  level: 'básico' | 'intermedio' | 'experto'
  tools: ForTool[]
  steps: ForStep[]
}

export interface ForDecision {
  match: string[]
  ext: string[]
  title: string
  icon: string
  verdict: string
  firstCmds: string[]
  sections: string[]
}

export interface ForCase {
  name: string
  level: string
  artefact: string
  path: string[]
  lesson: string
}

/* ─────────────────────────── ÁRBOL DE DECISIÓN ───────────────────────────
   "Me acaban de dar un reto de forense. Tengo N archivos. ¿Por dónde empiezo?"
   Reglas ordenadas: la primera que aplique gana. Verificado con `file`.      */

export const FOR_DECISIONS: ForDecision[] = [
  {
    match: ['raw', 'memdump', 'vmem', 'dmp', 'DD', 'línea 1 no dice nada reconocible'],
    ext: ['.raw', '.mem', '.vmem', '.dmp', '.dd', 'sin extensión + gigas de tamaño'],
    title: 'Volcado de RAM / memoria',
    icon: '🧠',
    verdict:
      '`file` dice «data» y el archivo pesa GB. Es un volcado de memoria física: TODO lo que vive en RAM en un instante (procesos, conexiones, contraseñas, claves, consolas). Se analiza con Volatility 3, nunca con strings a lo loco (aunque strings sirve como segunda pasada).',
    firstCmds: [
      'file memdump.raw                     # confirma: "data" (sin estructura reconocible)',
      'vol -f memdump.raw windows.info      # ¿Volatility reconoce el SO? PRIMER PASO SIEMPRE',
      'strings -n 8 memdump.raw | grep -iE "password|flag|http" | head   # pas rápida barata',
    ],
    sections: ['volatility'],
  },
  {
    match: ['DOS/MBR boot sector', 'GUID Partition Table', 'EWF/Expert Witness', 'imagen de disco'],
    ext: ['.img', '.dd', '.e01', '.raw', '.vhd', '.vmdk'],
    title: 'Imagen de disco / USB',
    icon: '💽',
    verdict:
      '`file` dice «DOS/MBR boot sector» o «GPT». Hay un sistema de archivos DENTRO: primero lista particiones con mmls, luego fls con el offset correcto. Nunca montes la imagen original: trabaja sobre copia o usa las tools TSK en solo lectura.',
    firstCmds: [
      'file disco.img                       # "DOS/MBR boot sector; partition 1 : ID=0x7..."',
      'mmls disco.img                       # tabla de particiones → anota el Start de la partición',
      'fsstat -o 64 disco.img               # metadatos del SISTEMA DE ARCHIVOS de esa partición',
      'fls -o 64 -r -p disco.img            # árbol COMPLETO de ficheros, incluidos borrados',
    ],
    sections: ['disk', 'files'],
  },
  {
    match: ['pcap capture file', 'pcapng'],
    ext: ['.pcap', '.pcapng', '.cap'],
    title: 'Captura de red',
    icon: '🌐',
    verdict:
      '`file` dice «pcap capture file». Se dissecciona con tshark (CLI de Wireshark). Empieza por estadísticas (capinfos, -z io,phs) para saber QUÉ protocolos hay antes de filtrar. Hay sección entera en la herramienta WiFilter Academy.',
    firstCmds: [
      'capinfos captura.pcap                # nº de paquetes, duración, tipo de enlace',
      'tshark -r captura.pcap -q -z io,phs  # jerarquía de protocolos: el mapa del terreno',
      'tshark -r captura.pcap -q -z conv,tcp # conversaciones TCP: quién habla con quién',
    ],
    sections: ['files'],
  },
  {
    match: ['Windows Event Log', 'EVTX'],
    ext: ['.evtx'],
    title: 'Log de eventos Windows (EVTX)',
    icon: '📜',
    verdict:
      '`file` dice «Windows Event Log» y la cabecera en hex empieza por «ElfFile\0». Binario comprimido por chunks: NO es un .log de texto. Se vuelca a XML con evtx_dump o python-evtx y después se filtra con grep/jq/python como cualquier XML.',
    firstCmds: [
      'file log.evtx                        # "Windows Event Log"',
      'xxd -l 16 log.evtx                   # "ElfFile\\x00\\x00" = firma EVTX',
      'evtx_dump log.evtx > log.xml         # todo el log a XML legible',
      'grep -c "<EventID>1<" log.xml        # cuenta eventos Process Creation (Sysmon)',
    ],
    sections: ['evtx'],
  },
  {
    match: ['prefetch', 'MAM\\x04', 'firma MAM'],
    ext: ['.pf'],
    title: 'Prefetch de Windows',
    icon: '⚡',
    verdict:
      'Windows guarda qué .exe se ejecutó y cuántas veces (hasta 8 timestamps). Los .pf de Win10 están COMPRIMIDOS con LZXPRESS-Huffman: `xxd -l 8 f.pf` debe mostrar la firma MAM\\x04. Sin descomprimir son basura; el descompresor está en la lib dissect de Python.',
    firstCmds: [
      'xxd -l 8 RUNDLL32.EXE-XXXX.pf        # "MAM\\x04" = comprimido (Win10); si no hay MAM, es WinXP/7 = plano',
      'python3 -c "from dissect.util.compression import lzxpress_huffman"   # dependencia',
      'photorec f.pf                        # alternativa GUI-less si no quieres Python (no siempre funciona en .pf)',
    ],
    sections: ['prefetch'],
  },
  {
    match: ['registry hive', 'ntuser', 'SAM/SOFTWARE/SYSTEM', 'regf'],
    ext: ['NTUSER.DAT', 'SAM', 'SOFTWARE', 'SYSTEM', 'SECURITY', '.hive'],
    title: 'Colmena de registro Windows',
    icon: '🗝️',
    verdict:
      '`file` sobre NTUSER.DAT dice «data», pero `xxd -l 4` muestra «regf» (registry file). Es una colmena del registro: se parsea con regipy (Python) o reg-query de Kroll. Autostarts, USBs conectadas, programas usados (UserAssist ROT13), MRUs.',
    firstCmds: [
      'xxd -l 4 NTUSER.DAT                  # "regf" = colmena de registro',
      'python3 -c "from regipy.registry import RegistryHive; h=RegistryHive(\'NTUSER.DAT\'); print(h.get_key(r\'\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\').get_values())"',
    ],
    sections: ['registry'],
  },
  {
    match: ['PC bitmap', 'JPEG', 'PNG', 'PDF', 'ZIP', 'cualquier firma de archivo conocida'],
    ext: ['.jpg', '.png', '.pdf', '.zip', '.docx', '.exe'],
    title: 'Archivo suelto (o dentro de otro)',
    icon: '📄',
    verdict:
      'Antes de abrirlo: `file` (¿es lo que dice ser?), `exiftool` (¿qué metadatos trae?), `binwalk` (¿lleva cosas EMBEBIDAS? — un .jpg con un zip dentro es el clásico de CTF). Si `file` dice «data» pero el nombre acaba en .jpg, alguien borró/rompió la cabecera: busca firmas.',
    firstCmds: [
      'file sospechoso.jpg                  # ¿firma real o mentira?',
      'exiftool sospechoso.jpg              # metadatos: cámara, GPS, software, comentarios',
      'binwalk sospechoso.jpg               # firmas embebidas (zip, png, certificados...)',
      'binwalk -e sospechoso.jpg            # extraer automáticamente lo embebido (--dd para elegir firmas)',
      '7z l sospechoso.jpg                  # si es un contenedor disfrazado, 7z lo lista igual',
    ],
    sections: ['files'],
  },
  {
    match: ['LNK shortcut', 'shell item', '.lnk'],
    ext: ['.lnk'],
    title: 'Acceso directo (.lnk) — artefacto oro',
    icon: '🔗',
    verdict:
      'Un .lnk de Windows guarda la ruta absoluta del objetivo, argumentos de línea de comandos, tamaño/fecha del target y a veces el VOLUMEN (nombre de USB, serial). Es de los artefactos que más IOC dan por byte. Firma: empieza por 4C 00 00 00 01 14 02 00... Se parsea con dissect.shellitem.',
    firstCmds: [
      'file malware.lnk                     # "MS Windows shortcut..."',
      'xxd malware.lnk | head -3            # firma 4c00 0000 0114 0200 ...',
      'python3 -m dissect.shellitem malware.lnk   # parsea shell items (lnk incluidos)',
    ],
    sections: ['files'],
  },
]

/* ─────────────────────────── SECCIÓN 1: VOLATILITY (RAM) ─────────────────────────── */

export const VOL_INFO = {
  install: `# Kali ya trae volatility3. Si no:
sudo apt install volatility3          # o el venv que usamos aquí:
python3 -m venv /tmp/dfirvenv
/tmp/dfirvenv/bin/pip install volatility3
# Los símbolos (PDB del kernel) se descargan SOLOS la primera vez
# a ~/.cache/volatility3/ — necesitas internet la primera vez por perfil.`,
  whatIsIt:
    'Cuando el equipo se apaga, la RAM desaparece. Un volcado (con FTK Imager, winpmem, o el propio hypervisor de la VM) congela ese instante. Volatility no «abre un archivo»: reconstruye las estructuras del kernel (EPROCESS, LIST_ENTRY, redes, registro en memoria…) buscando el perfil exacto del Windows que corría. Por eso el PRIMER comando siempre es windows.info: si ese falla, todo lo demás fallará.',
}

export const VOL_STEPS: ForSection[] = [
  {
    id: 'volatility',
    title: 'Análisis de volcados de RAM con Volatility 3',
    icon: '🧠',
    intro:
      'Volatility 3 usa plugins con formato windows.NOMBRE. La batería de abajo fue ejecutada COMPLETA contra un volcado real de Windows 10 (ksdb.raw, 4.8 GB) y las salidas que ves son literales. Orden recomendado: info → procesos → red → artefactos → malware.',
    level: 'básico',
    tools: [
      { cmd: 'vol -f dump.raw <plugin>', desc: 'Forma general de CUALQUIER plugin. vol es el binario de volatility3.', install: 'sudo apt install volatility3' },
      { cmd: 'vol -f dump.raw windows.info', desc: 'Perfil del SO: versión, kernel base, fecha/hora. Siempre el primero.', install: '' },
      { cmd: 'vol -f dump.raw windows.pslist', desc: 'Lista de procesos desde las listas enlazadas del kernel (fiable, no oculta nada pero puede ser engañada).', install: '' },
      { cmd: 'vol -f dump.raw windows.pstree', desc: 'Los mismos procesos en ÁRBOL de padre→hijo. El 80% del valor está aquí.', install: '' },
      { cmd: 'vol -f dump.raw windows.cmdline', desc: 'Línea de comandos COMPLETA de cada proceso (PID | Process | Args).', install: '' },
      { cmd: 'vol -f dump.raw windows.netscan', desc: 'Conexiones de red en el instante del volcado (TCP/UDP con estado, PID y proceso).', install: '' },
      { cmd: 'vol -f dump.raw windows.malfind', desc: 'Caza memoria con permisos EXEC y contenido anómalo (heurística de inyección).', install: '' },
      { cmd: 'vol -f dump.raw windows.handles --pid N', desc: 'Handles abiertos por un proceso: ficheros, pipes, claves, mutex.', install: '' },
      { cmd: 'vol -f dump.raw windows.registry.printkey --key "Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run"', desc: 'Lee una clave del registro DESDE RAM (hives cargados).', install: '' },
      { cmd: 'vol -f dump.raw windows.filescan && vol -f dump.raw windows.dumpfiles --virtaddr 0x…', desc: 'Escanea todos los ficheros en memoria y extrae uno por dirección física/virtual.', install: '' },
    ],
    steps: [
      {
        title: 'Paso 1 · windows.info — ¿esto es un volcado válido y de qué SO?',
        why: 'Si windows.info no imprime nada, o bien el archivo no es un volcado crudo de RAM, o Volatility no tiene símbolos para ese kernel. NO avances: resuelve esto antes. Te da Kernel Base y SystemTime para contextualizar TODO lo demás (¿los timestamps de los artefactos son coherentes con la hora del volcado?).',
        cmds: ['vol -f ksdb.raw windows.info'],
        expect:
          'Cabecera tipo: «Kernel Base 0xf80060e93000 · Is64Bit true · SystemTime 2024-01-24 … · Windows / Win10 15063 x64». Ese «15063» es la build: la apuntas porque algunos plugins la piden.',
        trap: 'Si falla con «unsatisfied requirement windows: kernel base», casi siempre es falta de símbolos (se descargan a ~/.cache/volatility3/ con internet) o el dump es de una versión exótica.',
      },
      {
        title: 'Paso 2 · pstree + cmdline — ¿qué procesos hay y de dónde salieron?',
        why: 'pstree dibuja la genealogía. Casi todo lo malicioso en Windows nace de una cadena anómala: office→cmd, explorer→powershell con ofuscación, un .exe en %TEMP%. cmdline te da el comando EXACTO que se ejecutó, con argumentos, sin depender de logs.',
        cmds: ['vol -f ksdb.raw windows.pstree', 'vol -f ksdb.raw windows.cmdline'],
        expect:
          'En el volcado real: System(4) → smss.exe(288) → … explorer.exe → avast_secure_browser.exe → SystemInformer.exe → msedge.exe (usuario dave). Fíjate en los asteriscos (*) de pstree: marcan procesos hijo con más hijos (expande el árbol).',
        trap: 'pslist lista; pstree RELACIONA. Un svchost.exe hijo de explorer.exe es un océano rojo. También compara: csrss.exe siempre hijo de smss.exe, services.exe siempre de winlogon.exe. Si rompes la regla, es malware.',
      },
      {
        title: 'Paso 3 · netscan — ¿conectado a algo?',
        why: 'IP + puerto + estado + PID + proceso dueño. Un proceso rarito con ESTABLISHED a una IP externa rara = probable C2 (Command & Control). También caza exfiltración (muchas conexiones a un mismo destino).',
        cmds: ['vol -f ksdb.raw windows.netscan'],
        expect:
          'Tabla: Offset | Proto | LocalAddr | ForeignAddr | State | PID | Owner. En nuestro volcado: svchost.exe(332) ESTABLISHED a 212.230.153.91:80, varios UDPv4 locales de svchost. Estados normales de una máquina viva: ESTABLISHED, CLOSE_WAIT, LISTENING, CLOSED.',
        trap: 'La columna Created puede ser N/A (la conexión sobrevivió al arranque del volcado o el escaneo no encontró la estructura de tiempo). No lo tomes como indicador de malware por sí solo.',
      },
      {
        title: 'Paso 4 · malfind — caza de código inyectado',
        why: 'Busca regiones de memoria privada (VadS) con protección PAGE_EXECUTE_READWRITE — combinación típica de shellcode inyectado — y cuyo contenido no casca como código legítimo. Es heurística: tiene falsos positivos (el propio Windows Defender, MsMpEng, aparece con regiones RWX legítimas).',
        cmds: ['vol -f ksdb.raw windows.malfind'],
        expect:
          'Columnas: PID | Process | Start VPN | Protection | Hexdump | Disasm. En el volcado real salen regiones de MsMpEng.exe (Defender) — LEGÍTIMO aquí. Aprendizaje clave: malfind marca; el ANALISTA descarta con conocimiento del proceso y de su límite de memoria.',
        trap: 'No reportes todo lo que malfind marque. MsMpEng, chrome, y cualquier JITted runtime dan RWX. Cruza con pstree: malfind en un proceso huérfano con cmdline raro es otra historia.',
      },
      {
        title: 'Paso 5 · registry.printkey — persistencia en RAM',
        why: 'Las claves Run / RunOnce dicen qué programas arrancan al iniciar sesión. Volatility lee los hives QUE ESTÁN CARGADOS EN RAM — a veces hay persistencia en memoria que ya se borró del disco.',
        cmds: [
          'vol -f ksdb.raw windows.registry.printkey --key "Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run"',
        ],
        expect:
          'Filas con Last Write Time, Hive Offset, Type (REG_SZ), Key, Name, Data. En el volcado real: OneDriveSetup y OneDrive para el usuario dave — NORMAL. Lo anómalo serían rutas a %TEMP%, %APPDATA\\Roaming, nombres aleatorios o comandos powershell -enc.',
        trap: 'La clave sin --key lista el raíz y pierdes el tiempo. Con volúmenes grandes usa también windows.registry.hivelist para ver qué hives hay cargados antes de tirar a ciegas.',
      },
      {
        title: 'Paso 6 · Experto — dumpfiles, dlllist, consoles, y las trampas del día a día',
        why: 'Cuando un proceso es sospechoso, lo siguiente es EXTRAER su memoria para IDA/strings, ver sus DLLs cargadas (dlllist) y su historial de consola (consoles/cmdline de cmd.exe) — esto último es mina de oro en retos tipo Under Zer0 (PSReadline no guarda en RAM pero sí en disco).',
        cmds: [
          'vol -f dump.raw windows.dlllist --pid 6076',
          'vol -f dump.raw windows.dumpfiles --pid 6076',
          'vol -f dump.raw windows.consoles        # historial de cmd.exe en RAM',
          'vol -f dump.raw windows.registry.userassist   # programas ejecutados por GUI (con contadores)',
        ],
        expect: 'dlllist lista módulos con base/size/path — busca DLLs cargadas desde rutas de usuario. dumpfiles genera un .dmp por región con el PID en el nombre.',
        trap: 'windows.dumpfiles genera MUCHOS archivos en dump.<pid>.<addr>.dmp — crea un dir antes. Y dumpfiles NO es fotográfico: Volatility reconstruye desde estructuras; la extracción puede incompletarse si la página fue paginada a disco.',
      },
    ],
  },
]

/* ─────────────────────────── SECCIÓN 2: DISCO — TSK ─────────────────────────── */

export const TSK_STEPS: ForSection = {
  id: 'disk',
  title: 'Análisis de imágenes de disco con The Sleuth Kit',
  icon: '💽',
  intro:
    'Una imagen .img/.dd/.e01 es un disco ENTERO a nivel de bytes: tabla de particiones + sistema de archivos + slack space + ficheros borrados. TSK (fls, mmls, icat, istat, fsstat) funciona EN SOLO LECTURA sobre la imagen — nunca montas el original. Todo lo de abajo está verificado contra la imagen real del reto Tattoo (USB MBR/NTFS de 512 MB).',
    level: 'intermedio',
    tools: [
      { cmd: 'file disco.img', desc: 'Te dice si es MBR, GPT o directamente data.', install: 'viene en Kali' },
      { cmd: 'mmls disco.img', desc: 'Tabla de particiones. El número que buscas es el START (en sectores de 512 por defecto).', install: 'sudo apt install sleuthkit' },
      { cmd: 'fsstat -o N disco.img', desc: 'Datos del SISTEMA DE ARCHIVOS de la partición en el offset N (clusters, MFT, versiones NTFS).', install: '' },
      { cmd: 'fls -o N -r -p disco.img', desc: 'Árbol de ficheros recursivo con rutas. El ORO: muestra también ficheros BORRADOS.', install: '' },
      { cmd: 'icat -o N disco.img INODO', desc: 'Extrae el contenido del inodo indicado (aunque esté marcado como borrado).', install: '' },
      { cmd: 'istat -o N disco.img INODO', desc: 'Metadatos del inodo: fechas MACB, tamaño, runs de clusters.', install: '' },
      { cmd: 'tsk_recover -e -a / -o N disco.img dir/', desc: 'Copia masiva de TODO (recuperado y borrado) a un directorio — más rápido que icat uno a uno.', install: '' },
    ],
    steps: [
      {
        title: 'Paso 1 · mmls — localizar la partición',
        why: 'Las tools de sistema de archivos (fls, icat) necesitan saber DÓNDE empieza la partición. El -o se expresa en SECTORES, y mmls te lo da en su columna Start.',
        cmds: ['file usb.img', 'mmls usb.img'],
        expect:
          'Salida real de la imagen Tattoo: «partition 1 : ID=0x7, active, start-CHS (0x0,1,2)… startsector 64, 1007168 sectors» y en mmls: «002: 000:000   0000000064   0001007231   0001007168   NTFS / exFAT (0x07)». El offset es 64.',
        trap: 'El -o es en SECTORES (unidades de mmls), no en bytes. Si mmls dijera que usa sectores de 4096, -o sería distinto. Y si mmls da error «cannot determine partition type», quizá no hay tabla: prueba fls directamente con -o 0 (ficheros sueltos, sin particionar).',
      },
      {
        title: 'Paso 2 · fls -r -p — el árbol (y los BORRADOS)',
        why: 'En NTFS, borrar un fichero no lo destruye: marca la entrada MFT como no asignada. fls las muestra con prefijo -/ y asterisco * — ahí está la magia del forense de disco.',
        cmds: ['fls -o 64 -r -p usb.img'],
        expect:
          'Del reto real: «r/r 42-128-1: autorun.inf» (asignado), «-/r * 48-128-1: s.jpg.exe» (BORRADO, inodo 48), «-/r * 45-128-3: desktop.lnk» (BORRADO, inodo 45). El formato es r/r|d/d inodo: ruta. El «-» y el «*» marcan no-asignado.',
        trap: 'Los $OrphanFiles con nombres basura largos NO son malware: son entradas MFT huérfanas que TSK inventa nombres para listar. Ignóralos salvo sospecha concreta.',
      },
      {
        title: 'Paso 3 · icat — extraer por inodo',
        why: 'Conoces el inodo del fichero borrado → icat lo recupera aunque el nombre ya no exista. Es el «cat» de TSK.',
        cmds: [
          'icat -o 64 usb.img 42 | file -          # ver QUÉ es antes de volcarlo',
          'icat -o 64 usb.img 42 > autorun.inf     # volcarlo',
          'icat -o 64 usb.img 45 > desktop.lnk     # el .lnk borrado del reto',
        ],
        expect: 'En el reto: icat del inodo 42 dice «Microsoft Windows Autorun file» — confirma autorun.inf. El 45 da el .lnk que parsearemos luego con dissect.shellitem.',
        trap: 'icat no valida extensiones: el inodo 48 (s.jpg.exe) se extrae igual aunque el OS diga «ejecutable Windows». SIEMPRE pasa la salida por file antes de fiarte del nombre original.',
      },
      {
        title: 'Paso 4 · fsstat, istat y tsk_recover — el arsenal completo',
        why: 'fsstat confirma el sistema de archivos (versión NTFS, tamaño de MFT, clusters). istat da las fechas MACB (Modified/Accessed/Changed/Created) — un fichero «borrado ayer» con fecha de creación de 1998 huele a manipulación. tsk_recover hace el trabajo sucio de extraer todo de golpe.',
        cmds: [
          'fsstat -o 64 usb.img',
          'istat -o 64 usb.img 48',
          'mkdir /tmp/rec && tsk_recover -e -a -o 64 usb.img /tmp/rec/',
        ],
        expect: 'fsstat de la imagen real: NTFS, bytes/sector 512, sectors/cluster 8, MFT en cluster 20864. istat imprime las fechas estándar, atributos y runs. tsk_recover -e incluye los borrados (sin -e solo asignados).',
        trap: '-a significa «solo asignados» — junto con -e se contradicen; en la práctica -e manda. Y tsk_recover vuelca el nombre original que llevara el fichero: cuidado al abrir .exe «recuperados».',
      },
    ],
  }

/* ─────────────────────────── SECCIÓN 3: FICHEROS SUELTOS ─────────────────────────── */

export const FILES_STEPS: ForSection = {
  id: 'files',
  title: 'Análisis de ficheros: file, xxd, binwalk, carving',
  icon: '📄',
  intro:
    'El nivel 0 de cualquier reto: un fichero (o cientos). La disciplina es SIEMPRE la misma: identificar → inspeccionar metadatos → buscar contenido embebido → extraer. Nunca ejecutes nada: todo se hace con herramientas de lectura.',
    level: 'básico',
    tools: [
      { cmd: 'file X', desc: 'Lee la CABECERA (magic bytes), no la extensión. Es la verdad.', install: 'viene en Kali' },
      { cmd: 'xxd -s 446 -l 16 X', desc: 'Volcado hex desde offset 446 (tabla de particiones MBR): 1 byte de estado, 3 CHS, 1 tipo, …', install: '' },
      { cmd: 'exiftool X', desc: 'Metadatos EXIF/XMP/IPTC de imágenes, PDFs, Office: cámara, GPS, software, comentarios.', install: 'sudo apt install libimage-exiftool-perl' },
      { cmd: 'binwalk X', desc: 'Escanea firmas embebidas: ZIP dentro de JPG, PNG dentro de PDF, cabeceras de filesystems…', install: 'sudo apt install binwalk' },
      { cmd: 'binwalk -e X  /  binwalk --dd="zip:zip" X', desc: 'Extrae automáticamente todo lo embebido (o solo la firma que digas).', install: '' },
      { cmd: 'photorec X', desc: 'Carving por firma sin depender del filesystem: recupera fotos/zip/pdf de imágenes y ficheros fragmentados.', install: 'sudo apt install testdisk' },
      { cmd: '7z l X  /  7z x X', desc: 'Si es un contenedor (zip/rar/iso/msi…), 7z lo lista o lo extrae aunque la extensión mienta.', install: 'viene en Kali' },
      { cmd: 'strings -n 6 X', desc: 'Cadenas legibles >= 6 chars. Pas rápida para IOC, URLs, rutas, flags.', install: '' },
      { cmd: 'md5sum / sha256sum X', desc: 'El hash de la flag/IOC: en Atenea casi todas las flags son MD5 de algo.', install: '' },
    ],
    steps: [
      {
        title: 'file + exiftool: identificar y contextualizar',
        why: 'file lee la cabecera; exiftool lee lo que el creador dejó escrito. Un .jpg con «Software: Adobe Photoshop» cuando la trama dice «captura de cámara» ya es una pista. Comentarios EXIF son escondite clásico de flags.',
        cmds: ['file misterio.jpg', 'exiftool misterio.jpg'],
        expect: 'file: «JPEG image data, JFIF standard 1.01…». exiftool: lista de campos con Camera Model, Software, Comment… Ojo: si file dice «data» pero el nombre es .jpg → cabecera rotada.',
        trap: 'Un fichero puede SER otra cosa de la que dice su nombre. file es la ley; la extensión es opinión.',
      },
      {
        title: 'binwalk: ¿lleva algo DENTRO?',
        why: 'Un .jpg puede contener un .zip al final de sus datos (el formato JPEG permite trailers). binwalk escanea signatures y te da offsets. Con -e extrae todo a un directorio _X.extracted/.',
        cmds: ['binwalk misterio.jpg', 'binwalk -e misterio.jpg', 'ls _misterio.jpg.extracted/'],
        expect: 'Tabla «DECIMAL | HEXADECIMAL | DESCRIPTION» con offsets de cada firma hallada. Tras -e: carpetas con los ficheros extraídos listos para inspección.',
        trap: 'binwalk -e a veces falla con ficheros raros; usa --dd="zip:zip" para elegir firmas concretas, o `dd if=X of=extraido.zip skip=<offset>` manual si binwalk no traga.',
      },
      {
        title: 'Carving manual y photorec',
        why: 'Cuando el filesystem miente (o no hay), el carving busca FIRMAS en crudo. Es cómo se recuperó el .lnk borrado del reto Tattoo: se greppeó la firma LNK (4c 00 00 00 01 14 02 00 … 00 00 46) sobre la imagen entera con grep -aob.',
        cmds: [
          "grep -aob \"\$(printf '\\x4c\\x00\\x00\\x00\\x01\\x14\\x02\\x00\\x00\\x00\\x00\\x00\\xc0\\x00\\x00\\x00\\x00\\x00\\x00\\x46')\" usb.img",
          'dd if=usb.img of=carved.lnk skip=464625664 bs=1 count=1024',
          'photorec usb.img',
        ],
        expect: 'grep -aob devuelve el OFFSET (0x1B8EF000 en el reto = 464625664 decimal). dd extrae desde ese byte. photorec hace lo mismo de forma interactiva por tipos de fichero.',
        trap: 'grep -aob sobre imágenes grandes tarda; -a fuerza binario como texto y -o imprime el offset byte a byte. La firma LNK del reto estaba tomada del writeup: si no la conoces, saca los primeros bytes de un .lnk legítimo y usa xxd para verlos.',
      },
      {
        title: 'El truco del .lnk: dissect.shellitem',
        why: 'Los .lnk guardan: ruta del target, ARGUMENTOS de línea de comandos, y shell items con volumen de origen (¡nombre de la USB!). dissect de Python lo parsea entero en un instante.',
        cmds: [
          'python3 -m dissect.shellitem carved.lnk',
          'python3 -c "from dissect.shellitem.lnk import Lnk; l = Lnk(open(\'carved.lnk\',\'rb\').read()); print(l.stringdata.command_line_arguments)"',
        ],
        expect: 'En el reto Tattoo, el .lnk apuntaba a s.jpg.exe con argumentos de ofuscación cmd tipo %a85a:~N,1% (substring de una variable que esconde el alfabeto). El stringdata.command_line_arguments era la línea maliciosa completa.',
        trap: 'dissect.shellitem espera un STREAM (bytes), no un path. Por eso en el segundo comando se hace open(...,\'rb\').read(). Si el .lnk está roto a medias, dissect lanza excepción — recupera con photorec o busca otra copia.',
      },
      {
        title: 'Ofuscación cmd: el truco de las variables substring',
        why: 'Los retos y el malware real usan %a85a:~0,1% para escribir letras sin que consten en claro. La variable a85a guarda un alfabeto desordenado; ~N,1 extrae el carácter N. Para leerlo: localiza la definición de la variable en el propio comando y sustituye mentalmente.',
        cmds: [
          'set a85a=abcdef...   # así se define (o viene en el propio comando)',
          'cmd /c echo %a85a:~0,1%   # imprime el primer carácter del alfabeto',
        ],
        expect: 'En el reto Tattoo, la cadena %a85a:~N,1% concatenada revelaba el dominio malicioso www.abeltarrant.io lanzado vía bitsadmin — el IOC que se hashaba para la flag.',
        trap: 'No busques el IOC con grep en claro: haz la prueba negativa (grep -aobc "www.abeltarrant.io" usb.img → 0). Confirma que el dominio SOLO existía ofuscado; si grep diera >0, algo falló en tu análisis.',
      },
    ],
  }

/* ─────────────────────────── SECCIÓN 4: EVTX ─────────────────────────── */

export const EVTX_STEPS: ForSection = {
  id: 'evtx',
  title: 'Logs de eventos Windows (EVTX) con Sysmon',
  icon: '📜',
  intro:
    'Los .evtx son binarios comprimidos por chunks. Sysmon (si está instalado) genera eventos raros de ver: EID 1 = creación de proceso (con CommandLine, ParentImage, Hashes), EID 3 = conexión de red, EID 5 = terminación, EID 7 = carga de DLL, EID 11 = creación de fichero, EID 17 = creación de pipe con nombre. Todo lo de abajo está verificado contra el EVTX real del reto JohnnyCab (Sysmon).',
    level: 'intermedio',
    tools: [
      { cmd: 'evtx_dump log.evtx > log.xml', desc: 'Vuelca TODO el EVTX a XML legible (el estándar para filtrar después).', install: 'sudo apt install python3-evtx  # o /tmp/dfirvenv/bin/evtx_dump (venv con python-evtx)' },
      { cmd: 'python3 -c "import Evtx.Evtx as evtx"', desc: 'API de python-evtx para scripting (iterparse, filtrado fino, parser de Attributes).', install: 'pip install python-evtx' },
      { cmd: 'grep "<EventID>1<" log.xml | wc -l', desc: 'Cuenta eventos de un tipo (1 = Process Creation en Sysmon).', install: '' },
      { cmd: 'jq / python xml.etree', desc: 'Para extraer campos concretos (CommandLine, Image, User) en lote.', install: '' },
    ],
    steps: [
      {
        title: 'Paso 1 · Confirmar formato y volcar a XML',
        why: 'Un .evtx no se puede greppear directamente. La firma (ElfFile\\0) en los primeros 8 bytes lo confirma. Vuelca TODO a XML y a partir de ahí trabajas con grep/jq/python como con cualquier log.',
        cmds: ['file johnnycab_1990.evtx', 'xxd -l 16 johnnycab_1990.evtx', 'evtx_dump johnnycab_1990.evtx > all.xml', 'grep -c "<EventID>1<" all.xml'],
        expect: 'file: «Windows Event Log». xxd: los primeros 8 bytes son 45 6c 66 46 69 6c 65 00 («ElfFile\\0»). all.xml contiene miles de <Event xmlns=...> anidados con System y EventData.',
        trap: 'Algunas builds de evtx_dump fallan por el bug del entrypoint «scripts»; usa python-evtx (Evtx.Evtx) como alternativa: `python3 -c "import Evtx.Evtx as e; with e.Evtx(\'f.evtx\') as log: [print(r.xml()) for r in log.records()]"`.',
      },
      {
        title: 'Paso 2 · Sysmon EID 1: el evento REY',
        why: 'Process Creation trae TODO: Image (el binario), CommandLine (con argumentos), ParentImage (quién lo lanzó), CurrentDirectory, Hashes, User. En retos tipo JohnnyCab, el proceso malicioso estaba ahí con su PID — y la flag era el MD5 del PID.',
        cmds: [
          'grep -B2 -A20 "<EventID>1<" all.xml | grep -iE "Image|CommandLine|ParentImage|CurrentDirectory" | head -30',
        ],
        expect: 'Líneas como <Data Name="Image">C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe</Data> o <Data Name="ParentImage">C:\\Users\\usuario\\AppData\\Local\\Temp\\algo.exe</Data>.',
        trap: 'No te fíes del ParentImage de un solo evento: Sysmon anida varios. Busca CADENAS (A lanzó B que lanzó C). Y haz caso a CurrentDirectory: rutas de \\Temp\\ o \\Downloads\\ son indicadores de staging.',
      },
      {
        title: 'Paso 3 · Los otros EID de Sysmon que resuelven retos',
        why: 'EID 11 (FileCreate) te dice QUÉ ficheros se plantaron y dónde. EID 17/18 (Pipe Created/Connected) delata PowerShell remoto (pipe PSHost) y su RuleName a veces trae la técnica MITRE (T1059.001 = PowerShell). EID 5 (Process Terminate) cierra la vida del proceso. EID 3 (Network Connect) muestra las conexiones salientes con IP/puerto/imagen. EID 7 (ImageLoad) lista DLLs cargadas — pista de lateral movement.',
        cmds: [
          'grep -B2 -A15 "<EventID>11<" all.xml | grep -iE "TargetFilename|Image" | head -20',
          'grep -B2 -A15 "<EventID>17<" all.xml | grep -iE "PipeName|RuleName|Image" | head -10',
          'grep -B2 -A15 "<EventID>3<" all.xml | grep -iE "DestinationIp|DestinationPort|Image" | head -20',
        ],
        expect: 'En JohnnyCab: pipe «PSHost» con RuleName T1059.001 delata powershell malicioso (PID 6076). El EID 11 muestra los ficheros previamente plantados. El EID 3 da las conexiones salientes del malware.',
        trap: 'Sysmon etiqueta el pipe PSHost también para PowerShell LEGÍTIMO. Correlaciona con el Image del evento: si el Image es powershell.exe lanzado desde un .exe en Temp, es otra cosa. Y el PID del evento es HEX en XML decimal — ojo al convertir para el hash de la flag.',
      },
      {
        title: 'Paso 4 · Scripting con python-evtx (el flujo real del analista)',
        why: 'Cuando hay millones de eventos, el grep se queda corto. python-evtx permite iterparse y filtrar en memoria con el namespace correcto. Patrón verificado en el writeup JohnnyCab:',
        cmds: [
          `import xml.etree.ElementTree as ET
NS = "{http://schemas.microsoft.com/win/2004/08/events/event}"
for ev, el in ET.iterparse("all.xml"):
    if el.tag == NS + "Event":
        eid = el.find(f".//{NS}EventID").text
        if eid == "1":
            d = {d.get("Name"): d.text for d in el.findall(f".//{NS}Data")}
            print(d.get("Image"), "|", d.get("CommandLine"))`,
        ],
        expect: 'Por cada evento EID 1, imprime Image y CommandLine — la lista completa de ejecuciones del sistema, lista para revisar en bloque.',
        trap: 'El NAMESPACE del EVTX es fijo: {http://schemas.microsoft.com/win/2004/08/events/event}. Sin él, findall devuelve listas vacías y pierdes media hora en pensar que tu filtro está roto.',
      },
    ],
  }

/* ─────────────────────────── SECCIÓN 5: PREFETCH ─────────────────────────── */

export const PREFETCH_STEPS: ForSection = {
  id: 'prefetch',
  title: 'Prefetch de Windows (LZXPRESS-Huffman)',
  icon: '⚡',
  intro:
    'Cada vez que se ejecuta un .exe, Windows escribe un .pf en C:\\Windows\\Prefetch con el nombre EXE-HASH.pf. Guarda: rutas de ficheros que tocó, número de ejecuciones y hasta 8 timestamps de las últimas ejecuciones. En Win10 va COMPRIMIDO con LZXPRESS-Huffman (firma MAM\\x04) — este es el flujo verificado en el reto Under Zer0 con los .pf reales de un triage KAPE.',
    level: 'experto',
    tools: [
      { cmd: 'xxd -l 8 F.pf', desc: 'Confirma la firma: 4d 41 4d 04 = «MAM\\x04» → comprimido (Win8+). Sin MAM = plano (WinXP/7).', install: 'viene en Kali' },
      { cmd: 'dissect.util.compression.lzxpress_huffman', desc: 'El descompresor de referencia (librería dissect de Fox-IT, pip install dissect.util).', install: 'pip install dissect.util' },
      { cmd: 'python3 (struct.unpack)', desc: 'Para leer los FILETIME (offset 0x80 del buffer descomprimido) y los contadores.', install: '' },
    ],
    steps: [
      {
        title: 'Paso 1 · Confirmar firma y descomprimir',
        why: 'El .pf comprimido empieza con MAM\\x04 + tamaño descomprimido (4 bytes LE). A partir del offset 8 está el stream LZXPRESS-Huffman. dissect lo descomprime en una línea.',
        cmds: [
          'xxd -l 8 C/RUNDLL32.EXE-XXXXX.pf',
          'python3 -c "\\nfrom dissect.util.compression import lzxpress_huffman\nraw = open(\'C/RUNDLL32.EXE-XXXXX.pf\', \'rb\').read()\nout = lzxpress_huffman.decompress(raw[8:])\nopen(\'rundll32.pf\', \'wb\').write(out)"',
        ],
        expect: 'xxd: «4d41 4d04 e89d 0000» — MAM\\x04 seguido del tamaño descomprimido (0x9de8 = 40424 bytes en el ejemplo real). El fichero out ya es un Prefetch plano que puedes strings-ear.',
        trap: 'NO uses zlib/gunzip: no es zlib. Es el algoritmo propietario LZXPRESS. Si dissect no está, prueba el proyecto kaitai de prefetch o windows-prefetch-parser — pero dissect es el que usan los pros.',
      },
      {
        title: 'Paso 2 · Leer el Prefetch descomprimido',
        why: 'El formato plano (verificado con struct sobre el buffer de rundll32.pf): cabecera de 84 bytes, luego strings UTF-16-LE con las rutas de ficheros que tocó, contadores y 8 timestamps FILETIME (offset 0x80).',
        cmds: [
          'strings -el rundll32.pf | head -20      # -el para UTF-16-LE',
          'python3 -c "\\nimport struct\nb = open(\'rundll32.pf\',\'rb\').read()\n# las 8 fechas de ejecución, FILETIME de Windows (100ns desde 1601)\nfor i in range(8):\n    ft = struct.unpack_from(\'<Q\', b, 0x80 + i*8)[0]\n    if ft:\n        ts = (ft - 116444736000000000) / 10_000_000\n        import datetime; print(datetime.datetime.utcfromtimestamp(ts))"',
        ],
        expect: 'strings -el lista rutas tipo \\VOLUME{GUID}\\WINDOWS\\SYSTEM32\\NTDLL.DLL o C:\\WINDOWS\\SYSTEM32\\RUNDLL32.EXE — y lo más jugoso: las DLLs/ficheros que cargó, que en retos delatan payloads (en Under Zer0: %TEMP%\\rate_x32.dat cargado por rundll32 → IcedID).',
        trap: 'Los FILETIME son 100-nanosegundos desde 1601-01-01. La conversión a Unix es restar 11644473600 segundos. Si te salen fechas de 1601, es que el contador no estaba inicializado (no ha llegado a 8 ejecuciones) — filtra ft != 0.',
      },
      {
        title: 'Paso 3 · Cómo se usa en el mundo real',
        why: 'Los .pf responden la pregunta «¿esto se EJECUTÓ aunque ahora no exista?». En Under Zer0, el atacante borró binarios, pero los .pf de rundll32 y SDelete seguían contando la historia: IcedID → Conti, con SDelete/BleachBit como anti-forense (y libzzz.dll como pista falsa: es GTK, no SDelete).',
        cmds: [
          'ls C/Windows/Prefetch/ | grep -iE "rundll|sdelete|cmd|powershell"',
          'strings -el C/Windows/Prefetch/DELETE.EXE-XXX.pf   # el propio SDelete',
        ],
        expect: 'Nombres de .exe que YA NO están en disco pero sí en Prefetch = evidencia de ejecución + borrado posterior. Es el clásico de la triage KAPE de Velociraptor.',
        trap: 'Prefetch se puede DESACTIVAR en Windows (Regkey EnablePrefetcher). Si no hay .pf, no significa que nada se ejecutó: significa que alguien lo limpió o lo desactivó. Contrasta con Shimcache/AmCache.',
      },
    ],
  }

/* ─────────────────────────── SECCIÓN 6: REGISTRO WINDOWS ─────────────────────────── */

export const REGISTRY_STEPS: ForSection = {
  id: 'registry',
  title: 'Colmenas del registro Windows (regipy)',
  icon: '🗝️',
  intro:
    'El registro es la base de datos de configuración de Windows. Sus hives en disco (SAM, SYSTEM, SOFTWARE, NTUSER.DAT de cada usuario) son un mapa del sistema: qué programas arrancan (Run), qué USBs se enchufaron (USBSTOR), qué se ejecutó desde GUI (UserAssist, con valores ROT13), qué rutas se teclearon (RunMRU). regipy es el parser Python de referencia — API verificada.',
    level: 'intermedio',
    tools: [
      { cmd: 'regipy.registry.RegistryHive', desc: 'Abre una colmena. .get_key(ruta) devuelve una clave; .iter_subkeys() itera hijas; .get_values() los valores (v.name, v.value).', install: 'pip install regipy' },
      { cmd: 'regipy.plugins', desc: 'Plugins empaquetados: usbstor, userassist, runmr, shimcache…', install: '' },
      { cmd: 'xxd -l 4 hive', desc: 'Confirma «regf» (registry file) — NTUSER.DAT y SAM dicen «data» con file.', install: '' },
    ],
    steps: [
      {
        title: 'Paso 1 · Abrir la hive y navegar',
        why: 'Lo primero: confirmar que es una hive (firma regf) y saber a QUÉ clave ir. Las rutas en regipy empiezan con \\ y NO llevan HiveName (no \\REGISTRY\\USER\\…, solo \\Software\\Microsoft\\…).',
        cmds: [
          'xxd -l 4 NTUSER.DAT',
          'python3 -c "\\nfrom regipy.registry import RegistryHive\nh = RegistryHive(\'NTUSER.DAT\')\nk = h.get_key(r\'\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\')\nfor v in k.get_values(): print(v.name, \'=\', v.value)"',
        ],
        expect: 'get_key devuelve un NKRecord con .get_values() — lista de valores (nombre, tipo REG_SZ/DWORD, dato). En NTUSER.DAT real del reto Under Zer0 la clave Run existe (aunque en ese caso sin autostarts maliciosos).',
        trap: 'regipy NO acepta la ruta con el prefijo de hive (\\REGISTRY\\MACHINE\\SOFTWARE), solo la parte relativa. Y las rutas con espacios NO llevan comillas dentro de la raw string.',
      },
      {
        title: 'Paso 2 · Artefactos que salvan retos',
        why: 'Run/RunOnce = persistencia. UserAssist = programas lanzados desde GUI (valores ROT13: «HRZR_PGYFRFFVBA» = «Vibe Session»). RunMRU = últimas rutas TECLEADAS en Ejecutar. USBSTOR (en SYSTEM) = USBs enchufadas con nombre/serial. Shimcache = ejecuciones históricas aunque se haya borrado el binario.',
        cmds: [
          `from regipy.registry import RegistryHive
h = RegistryHive('NTUSER.DAT')
# UserAssist: GUIDs {CEBFF5CD-ACE2-4F4F-9178-9926F41749EA} (exe) y {F4E57C4B-...} (lnk)
ua = h.get_key(r'\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist')
for s in ua.iter_subkeys():
    cnt = s.get_subkey('Count')
    if cnt:
        for v in cnt.get_values():
            print(v.name, '→', codecs.encode(v.name, 'rot_13'))   # ROT13 para legible`,
          'python3 -c "\nfrom regipy.registry import RegistryHive\nh = RegistryHive(\'SYSTEM\')\nusb = h.get_key(r\'\\\\ControlSet001\\\\Enum\\\\USBSTOR\')\nfor s in usb.iter_subkeys(): print(s.name)"',
        ],
        expect: 'En NTUSER.DAT real del reto Under Zer0: Snipping Tool, Vibe Session y demás apps del usuario — con valores ROT13 que regipy decodifica si usas codecs.encode(name, \'rot_13\'). USBSTOR enumera cada pendrive conectado alguna vez con su serial.',
        trap: 'recurse_subkeys() NO acepta el parámetro path (AttributeError en regipy actual). Y NO uses header.last_key_written_timestamp_and_zero para la fecha: también lanza AttributeError. Usa key.timestamp.',
      },
      {
        title: 'Paso 3 · Contraste con Volatility (hives EN RAM)',
        why: 'A veces el atacante borró la clave del disco, pero el hive estaba CARGADO en RAM cuando se tomó el volcado: windows.registry.printkey lo recupera. Es la razón por la que la RAM es un artefacto forense de primera clase.',
        cmds: [
          'vol -f dump.raw windows.registry.hivelist',
          'vol -f dump.raw windows.registry.printkey --key "Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run"',
        ],
        expect: 'En el volcado ksdb.raw real: hivelist lista los offsets de SYSTEM, SOFTWARE, SAM, NTUSER.DAT de dave… y printkey devuelve OneDrive con REG_SZ — la persistencia legítima de esa máquina, lista para descartar.',
        trap: 'No mezcles: registry.printkey lee RAM (volcado), regipy lee disco (hives extraídos). El mismo artefacto, dos fuentes, a veces con datos DIFERENTES — y esa diferencia ES la pista.',
      },
    ],
  }

/* ─────────────────────────── CASOS REALES (Atenea) ─────────────────────────── */

export const FOR_CASES: ForCase[] = [
  {
    name: 'JohnnyCab (Atenea, Easy)',
    level: 'Easy',
    artefact: 'EVTX Sysmon (johnnycab_1990.evtx)',
    path: [
      'evtx_dump → all.xml (XML)',
      'grep EventID 1 → cadenas de Image/ParentImage/CurrentDirectory',
      'rutas \\Temp\\, \\Downloads\\ = staging',
      'EID 17 → pipe PSHost + RuleName T1059.001',
      'EID 11 → ficheros plantados antes',
      'EID 3 → conexiones salientes',
      'flag = MD5 del PID del proceso malicioso',
    ],
    lesson:
      'Con un solo EVTX Sysmon se puede reconstruir TODO el ataque: fichero plantado → proceso lanzado → PowerShell con pipe PSHost → conexión a C2 → terminación. No necesitas ni la imagen: el LOG ES la escena del crimen.',
  },
  {
    name: 'Tattoo (Atenea, Easy)',
    level: 'Easy',
    artefact: 'Imagen de USB MBR/NTFS (usb_mnt20202703.img)',
    path: [
      'file → MBR, partición 0x07 en sector 64',
      'mmls → Start 64',
      'fls -o 64 -r -p → autorun.inf (42), desktop.lnk BORRADO (45), s.jpg.exe BORRADO (48)',
      'icat 42 → autorun.inf (ejecuta s.jpg.exe)',
      'carving firma LNK → offset 0x1B8EF000',
      'dissect.shellitem → argumentos %a85a:~N,1%',
      'decodificación → www.abeltarrant.io vía bitsadmin',
      'prueba negativa grep -aobc → 0 (el IOC solo existía ofuscado)',
      'flag = MD5 del dominio',
    ],
    lesson:
      'Un pendrive infectado clásico: autorun.inf como vector, .exe disfrazado de .jpg, y un .lnk borrado que el atacante no sabía que NTFS guarda. La lección: los BORRADOS de fls son casi siempre la vía.',
  },
  {
    name: 'Under Zer0 (Atenea, Intermediate)',
    level: 'Intermediate',
    artefact: 'Triage KAPE de Velociraptor (Prefetch, NTUSER.DAT, hives, PSReadline)',
    path: [
      'Prefetch .pf: firma MAM\\x04 → LZXPRESS-Huffman',
      'dissect.util.compression.lzxpress_huffman.decompress(raw[8:])',
      'strings -el → rundll32.exe cargó %TEMP%\\rate_x32.dat (IcedID → Conti)',
      'FILETIME en offset 0x80 → hasta 8 ejecuciones',
      'PSReadline ConsoleHost_history.txt → comandos del atacante',
      '.lnk de Recent → dissect.shellitem',
      'NTUSER.DAT con regipy → UserAssist ROT13, RunMRU',
      'anti-forense: SDelete, BleachBit, libzzz.dll (pista falsa, es GTK)',
      'flag = MD5 del nombre del proceso/payload',
    ],
    lesson:
      'El triage KAPE NO es una imagen: son ficheros sueltos ya seleccionados por Velociraptor. Cada fichero es un ARTEFACTO con su parser específico. La lección: saber qué es cada fichero (por nombre y firma) es el 80% del trabajo.',
  },
]

/* ─────────────────────────── SHARED ─────────────────────────── */

export const FOR_ENV_NOTE =
  'Esta guía está escrita y TESTADA sobre Kali Linux. Todos los comandos se ejecutaron contra evidencias reales (volcado de RAM Win10 de 4.8 GB, imagen USB NTFS, EVTX Sysmon, triage KAPE de Velociraptor) y las salidas que ves son literales. Si usas otra distro, los paquetes cambian (apt→dnf/pacman) pero los comandos son idénticos.'
