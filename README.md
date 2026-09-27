# DeepCommits

Genera mensajes de commit de Git a partir de tus cambios en staging, usando la API de [DeepSeek](https://platform.deepseek.com/).

## Uso

1. Haz `git add` de los cambios que quieras commitear.
2. Abre el panel de **Source Control** en VS Code.
3. Pulsa el botón **DeepCommits: Generate Commit Message** (icono de chispa) en la barra de título del SCM.
4. El mensaje generado se coloca en el cuadro de commit; revísalo y edítalo antes de confirmar.

Si no hay cambios en staging, se usa el diff del working tree.

Para resetear la API key guardada, ejecuta el comando **DeepCommits: Clear Stored API Key** desde la paleta de comandos (`Ctrl+Shift+P`).

## Configuración

| Setting | Descripción | Default |
| --- | --- | --- |
| `deepcommits.apiKey` | API key de DeepSeek. Si se deja vacía, la extensión la pide una vez y la guarda de forma segura en el secret storage de VS Code. | `""` |
| `deepcommits.model` | Modelo de DeepSeek a usar. | `deepseek-chat` |
| `deepcommits.language` | Idioma del mensaje generado. | `en` |
| `deepcommits.commitConvention` | `conventional` para forzar el formato de Conventional Commits, o `freeform`. | `conventional` |

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

- `DeepSeekClient`: cliente de la API de DeepSeek, construye el prompt y llama al endpoint de chat completions.
- `ConfigService`: lee la configuración de VS Code y resuelve/guarda la API key en el secret storage.
- `GitRepositoryService`: envuelve la API del `vscode.git` para elegir el repositorio activo y leer su diff.
- `extension.ts`: registra los comandos y orquesta las clases anteriores.

Convenciones de código en [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## CI

Cada push/PR a `main` corre `typecheck`, `lint`, `test` y `compile` vía GitHub Actions (`.github/workflows/ci.yml`).
