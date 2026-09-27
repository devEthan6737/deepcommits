# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

## [0.1.2]

### Fixed

- El error al commitear ya no muestra el mensaje genérico `Command failed: ...` cuando `git` reporta el motivo del fallo (p. ej. "nada para confirmar") por `stdout` en lugar de `stderr`.

### Changed

- Reorganizado `src/` en carpetas por dominio (`config/`, `deepseek/`, `git/`, `panel/`).
- Extraído el HTML/CSS/JS del panel Webview a `src/panel/CommitPanel.html`, bundleado por webpack como `asset/source`.
- Sustituidos los strings mágicos por `enum` (IDs de comandos, claves de configuración, roles de mensaje de DeepSeek, mensajes del webview, subcomandos de `git`, entre otros) para mayor seguridad de tipos.

## [0.1.1]

### Fixed

- El commit desde el panel ahora se ejecuta con `git commit` vía `child_process`, en lugar de depender de la API interna de la extensión Git integrada de VS Code, que podía fallar por configuración de `git.path`.

### Changed

- Renombrado el publisher de la extensión a `etherener`.

## [0.1.0]

### Added

- Comando `DeepCommits: Generate Commit Message` para generar mensajes de commit a partir del diff en staging usando la API de DeepSeek.
- Comando `DeepCommits: Clear Stored API Key` para borrar la API key guardada.
- Configuración de `apiKey`, `model`, `language` y `commitConvention`.
- Almacenamiento seguro de la API key mediante el secret storage de VS Code.
- Timeout de 30s en las llamadas a la API de DeepSeek.
- Icono de la extensión.
- Panel DeepCommits (Webview) con estilo acorde al tema activo, historial de commits recientes, info del repositorio y tokens consumidos por generación.
- Comando `DeepCommits: Open Panel` y atajo `Ctrl+Alt+M` / `Cmd+Alt+M` (`DeepCommits: Generate and Commit Instantly`) para generar y commitear en un solo paso.
- Configuración `deepcommits.customInstructions` para personalizar el estilo de los mensajes generados por la IA.

### Changed

- Reducido drásticamente el consumo de tokens por generación (diff limitado a 2000 caracteres, `max_tokens` de 120, prompt más corto e instrucciones personalizadas limitadas a 200 caracteres), apuntando a un tope de ~900 tokens por commit.
