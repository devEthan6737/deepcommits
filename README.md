# DeepCommits

Genera mensajes de commit de Git a partir de tus cambios en staging, usando la API de [DeepSeek](https://platform.deepseek.com/).

## Uso

### Desde Source Control

1. Haz `git add` de los cambios que quieras commitear (si no hay nada en staging, se usa el diff del working tree).
2. En el panel **Source Control**, pulsa el botón de chispa **DeepCommits: Generate Commit Message**.
3. El mensaje generado se coloca en el cuadro de commit. Revísalo, edítalo si hace falta, y confirma tú mismo.

### Panel DeepCommits

**DeepCommits: Open Panel** (paleta de comandos o icono de chispa) abre un panel lateral con:

- Info del repo activo: nombre, rama, archivos en staging/modificados.
- Un cuadro de mensaje editable, con los tokens consumidos (prompt + completion + total) tras cada generación.
- Historial de commits recientes.
- Botones propios **Generate** y **Commit**.

### Generar y commitear al instante

`Ctrl+Alt+M` (`Cmd+Alt+M` en macOS) genera el mensaje desde el diff en staging y commitea de inmediato, sin pasos intermedios.

Para olvidar la API key guardada: **DeepCommits: Clear Stored API Key**.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `DeepCommits: Generate Commit Message` | Genera un mensaje a partir del diff en staging y lo coloca en el cuadro de commit del panel Source Control. |
| `DeepCommits: Open Panel` | Abre el panel lateral de DeepCommits. |
| `DeepCommits: Generate and Commit Instantly` | Genera el mensaje y commitea de inmediato (atajo `Ctrl+Alt+M` / `Cmd+Alt+M`). |
| `DeepCommits: Clear Stored API Key` | Borra la API key guardada en el secret storage. |

## Configuración

| Setting | Descripción | Default |
| --- | --- | --- |
| `deepcommits.apiKey` | API key de DeepSeek. Si se deja vacía, se pide una vez y se guarda en el secret storage de VS Code. | `""` |
| `deepcommits.model` | Modelo de DeepSeek a usar. | `deepseek-chat` |
| `deepcommits.language` | Idioma del mensaje generado. | `en` |
| `deepcommits.commitConvention` | `conventional` para forzar Conventional Commits, o `freeform`. | `conventional` |
| `deepcommits.customInstructions` | Instrucciones de estilo propias para la IA, aplicadas junto a `commitConvention`. Se recorta a 200 caracteres. | `""` |

## Consumo de tokens

Cada generación apunta a un tope de ~900 tokens:

- El diff se recorta a 2000 caracteres antes de enviarse (si excede el límite, se añade `[diff truncated for length]`).
- Prompt de sistema corto, instrucciones personalizadas limitadas a 200 caracteres.
- Respuesta del modelo limitada a 120 tokens (`max_tokens`).

## Desarrollo

```bash
pnpm install
pnpm run watch
```

`F5` en VS Code lanza un Extension Development Host con la extensión cargada.

| Comando | Qué hace |
| --- | --- |
| `pnpm run compile` | Build con webpack. |
| `pnpm run typecheck` | Verifica tipos con `tsc --noEmit`. |
| `pnpm run lint` | ESLint sobre `src/`. |
| `pnpm run test` | Tests unitarios con Vitest. |
| `pnpm run package` | Build de producción con webpack. |
| `pnpm run package:vsix` | Genera el `.vsix` instalable con `vsce`. |

Convenciones de código en [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## CI

Cada push/PR a `main` corre `typecheck`, `lint`, `test` y `compile` vía GitHub Actions (`.github/workflows/ci.yml`).
