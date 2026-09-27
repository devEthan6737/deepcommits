# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

## [0.1.0] - Unreleased

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
