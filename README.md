# DeepCommits

Genera mensajes de commit de Git a partir de tus cambios en staging, usando la API de [DeepSeek](https://platform.deepseek.com/).

## Uso

### Flujo rápido (barra de Source Control)

1. Haz `git add` de los cambios que quieras commitear.
2. Abre el panel de **Source Control** en VS Code.
3. Pulsa el botón **DeepCommits: Generate Commit Message** (icono de chispa) en la barra de título del SCM.
4. El mensaje generado se coloca en el cuadro de commit; revísalo y edítalo antes de confirmar tú mismo.

Si no hay cambios en staging, se usa el diff del working tree.

### Panel DeepCommits

Ejecuta **DeepCommits: Open Panel** desde la paleta de comandos (`Ctrl+Shift+P`) o el icono de chispa en el SCM para abrir un panel lateral que:

- Respeta automáticamente los colores del tema activo de VS Code.
- Muestra info del repo (nombre, rama, archivos en staging/modificados).
- Genera y permite editar el mensaje antes de comitear, mostrando debajo los **tokens consumidos** (prompt + completion + total), igual que en la app de Claude.
- Lista los commits recientes del repositorio.
- Tiene sus propios botones **Generate** y **Commit**.

### Atajo de teclado: generar y commitear al instante

`Ctrl+Alt+M` (`Cmd+Alt+M` en macOS) abre el panel, genera el mensaje a partir del diff en staging y **commitea inmediatamente**, sin pasos intermedios. Útil para el flujo rápido de "ya revisé mi diff, solo commitea".

Para resetear la API key guardada, ejecuta el comando **DeepCommits: Clear Stored API Key** desde la paleta de comandos.

## Configuración

| Setting | Descripción | Default |
| --- | --- | --- |
| `deepcommits.apiKey` | API key de DeepSeek. Si se deja vacía, la extensión la pide una vez y la guarda de forma segura en el secret storage de VS Code. | `""` |
| `deepcommits.model` | Modelo de DeepSeek a usar. | `deepseek-chat` |
| `deepcommits.language` | Idioma del mensaje generado. | `en` |
| `deepcommits.commitConvention` | `conventional` para forzar el formato de Conventional Commits, o `freeform`. | `conventional` |
| `deepcommits.customInstructions` | Instrucciones de estilo propias para la IA (p. ej. "menciona siempre el módulo afectado entre paréntesis"), aplicadas junto a `commitConvention`. | `""` |

## Desarrollo

```bash
pnpm install
pnpm run watch
```

Presiona `F5` en VS Code para lanzar una ventana de Extension Development Host con la extensión cargada.

### Comandos

- `pnpm run compile`: compila con webpack.
- `pnpm run typecheck`: verifica tipos con `tsc --noEmit`.
- `pnpm run lint`: corre ESLint sobre `src/`.
- `pnpm run test`: corre los tests unitarios con Vitest.
- `pnpm run package`: build de producción con webpack.
- `pnpm run package:vsix`: genera el `.vsix` instalable con `vsce`.

## Arquitectura

- `DeepSeekClient`: cliente de la API de DeepSeek, construye el prompt (incluyendo instrucciones personalizadas) y llama al endpoint de chat completions, devolviendo el mensaje y el uso de tokens.
- `ConfigService`: lee la configuración de VS Code y resuelve/guarda la API key en el secret storage.
- `GitRepositoryService`: envuelve la API del `vscode.git` para elegir el repositorio activo, leer su diff, commitear y leer su historial.
- `CommitPanel`: panel Webview (estilo Notion, respeta el tema) que orquesta generación, edición, commit e historial.
- `extension.ts`: registra los comandos y orquesta las clases anteriores.

Convenciones de código en [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## CI

Cada push/PR a `main` corre `typecheck`, `lint`, `test` y `compile` vía GitHub Actions (`.github/workflows/ci.yml`).
