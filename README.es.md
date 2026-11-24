# ContributionLedger

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | Español

Convierte resúmenes comprimidos de sesiones de ingeniería en un registro revisable de posibles contribuciones de código abierto.

ContributionLedger es deliberadamente pequeño y determinista:

- **Sin conexión.** Sin llamadas de red, sin LLM, sin base de datos.
- **La evidencia primero.** Cada caso se remonta a un id de sesión, un índice de bloque y un tema.
- **Histórico por diseño.** La etapa registrada es lo que decían las sesiones en ese momento, no el estado actual de un proyecto upstream.
- **Consciente de la privacidad.** El texto original del resumen no se copia en el informe. Las claves comunes se marcan y se redactan.

No es un generador automático de issues. Produce pistas para que una persona reproduzca, verifique y hable con los mantenedores.

## Por qué

Las sesiones de agentes de larga duración contienen evidencia de depuración útil, pero está dispersa en bloques comprimidos. Copiar resúmenes en un issue público genera ruido y puede filtrar datos privados. ContributionLedger extrae solo la forma reproducible:

- componente y síntoma
- sesiones distintas donde apareció el síntoma
- etapa registrada (mencionada, diagnosticada, corregida localmente, enviada, fusionada)
- referencias a issues/PR de GitHub encontradas en el texto
- contradicciones entre conclusiones anteriores y posteriores
- siguiente acción manual

## Requisitos

- Node.js 22 o posterior
- Un inventario JSONL exportado desde tu almacén de sesiones

## Uso

```bash
node bin/contributionledger.mjs --input sessions.jsonl --out ./contributionledger-out
```

Opciones:

```text
-i, --input <file>       inventario JSONL a leer (obligatorio)
-o, --out <dir>          directorio de salida (por defecto: ./contributionledger-out)
    --min-sessions <n>   conservar solo casos vistos en al menos n sesiones (por defecto: 1)
-h, --help               mostrar ayuda
-v, --version            mostrar versión
```

Salida:

```text
contributionledger-out/
  report.md     cola legible y evidencia
  cases.json    casos estructurados para otras herramientas
```

El archivo de entrada se abre en modo de solo lectura. La herramienta no lo modifica.

## Formato de entrada

Un objeto JSON por línea:

```json
{
  "id": "session-123",
  "title": "Capacidad de imagen de CodeArts",
  "blockDetails": [
    {
      "topic": "Soporte de imágenes",
      "summary": "El modelo estaba documentado como solo texto, pero el kernel envió una imagen real."
    }
  ]
}
```

`blocks` se acepta como alias de `blockDetails`. Cada bloque necesita `topic` y `summary`. Consulta [docs/input-format.md](docs/input-format.md) para más detalles.

## Cómo se construyen los casos

1. Leer cada sesión y cada bloque.
2. Ejecutar reglas conservadoras de síntomas sobre `topic + summary`.
3. Extraer referencias de GitHub, etapa registrada, contradicciones y marcas de privacidad.
4. Agrupar por componente y síntoma.
5. Ordenar por número de sesiones distintas, correcciones locales, referencias upstream, contradicciones y apariciones.
6. Generar una cola y la evidencia.

Las diez reglas integradas cubren las áreas de las que se extrajo este proyecto: capacidad de imagen de CodeArts, ciclo de vida de plugins de OpenCode, ciclo de vida de procesos MCP, metadatos de razonamiento, compresión de contexto, arranque de DSH, topología AOA de GridDraft, estructura de informes de Word, cobertura de subtítulos y metadatos de proveedores de Magpie.

## Etapas registradas

| Etapa | Significado |
|---|---|
| `mentioned` | Se mencionó un síntoma; aún no hay diagnóstico |
| `diagnosed` | Se informó una causa raíz |
| `local-fix-reported` | Se informó una corrección local |
| `upstream-submitted` | Se informó un issue o PR |
| `duplicate-reported` | Se cerró como duplicado |
| `merged-reported` | Se informó como fusionado |

`merged-reported` no significa que el proyecto upstream esté fusionado actualmente. Vuelve a comprobar el enlace antes de actuar.

## Privacidad

- El informe no incluye el texto original de los resúmenes.
- Se detectan claves de API comunes, tokens de GitHub, tokens de Slack, cabeceras de autenticación, claves privadas, cargas de imágenes en base64 y asignaciones de password.
- Los valores detectados se redactan en los temas conservados en `cases.json`; el informe solo muestra los nombres de las marcas.
- Los datos reales de sesiones no deben subirse a un repositorio público. Usa el fixture sintético para pruebas y demostraciones.

Ningún escáner es perfecto. Revisa `cases.json` antes de compartirlo.

## Desarrollo

```bash
npm test
npm run check
node bin/contributionledger.mjs --input tests/fixtures/synthetic.jsonl --out /tmp/contributionledger-demo
```

La suite de pruebas solo usa `node:test` y la biblioteca estándar de Node.

## Limitaciones

- Las reglas son deliberadamente estrechas. Es preferible omitir un caso que producir un falso positivo con confianza.
- La herramienta no lee transcripciones completas ni registros de herramientas. Trabaja con el inventario comprimido que le proporciones.
- No puede decidir si un issue upstream reportado sigue abierto.
- No crea issues ni abre pull requests.

## Licencia

MIT. Consulta [LICENSE](LICENSE).