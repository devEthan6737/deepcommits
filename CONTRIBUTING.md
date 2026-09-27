# Guía de contribución — DeepCommits

Este documento define las convenciones de código para este proyecto (extensión de VS Code en TypeScript, empaquetada con webpack, gestionada con pnpm). Son de cumplimiento obligatorio en todo código nuevo y en cualquier refactor.

## 1. Paradigma y estructura

- **Orientación a objetos siempre que el dominio lo permita.** Lógica de negocio (cliente de la API de DeepSeek, resolución de configuración, acceso al repositorio Git) se implementa como clases (estilo Java): estado encapsulado, métodos con una responsabilidad, dependencias inyectadas por constructor.
- **Excepción: `extension.ts` y los manejadores de comandos.** Son el punto de entrada y los controladores que conectan la API de VS Code con el dominio, no dominio de negocio — se mantienen como funciones, no se fuerza una clase donde no aporta valor.
- **Un archivo, una responsabilidad.** Un archivo no debe mezclar una clase de dominio con utilidades sueltas ni constantes.
- **Indentación de 4 espacios** en todo el código TypeScript/JavaScript/JSON del repositorio. No se usan tabs.

## 2. Nomenclatura de archivos y clases

- **PascalCase para archivos que exportan una clase**, con el nombre del archivo igual al nombre exportado:
  - `DeepSeekClient.ts` → `export class DeepSeekClient`
- **PascalCase para nombres de clases**, sin excepción.
- Archivos que no exportan una clase (helpers puros, tipos, constantes) usan `camelCase` o el sufijo temático correspondiente (ver §4).

## 3. Funciones y métodos

- **Máximo 3 parámetros por función o método.** Si se necesitan más, se agrupan en un objeto de opciones tipado (`interface` o `type`) recibido como único parámetro.
- **Una función = una responsabilidad.** Si una función hace más de una cosa (ej. valida y además persiste, o transforma y además notifica), se divide en funciones separadas con nombres que describan exactamente esa única responsabilidad.
- Nombres de función en `camelCase`, verbo + sustantivo (`generateCommitMessage`, no `commitData`).

## 4. Constantes

- Las constantes se escriben en **PascalCase**, igual que una clase o un tipo:
  ```ts
  // Antes (prohibido)
  export const MAX_RETRIES = 3;

  // Ahora (correcto)
  export const MaxRetries = 3;
  ```
- Toda constante compartida entre varios archivos se agrupa por dominio en un fichero dedicado con el sufijo `.constants.ts`:
  - `DeepSeek.constants.ts` → `DefaultModel`, `MaxDiffLength`, etc.
  - No se declaran constantes de configuración sueltas dentro de archivos de lógica; se importan desde su `.constants.ts` correspondiente.
- Constantes puramente locales y triviales dentro de una función (ej. un límite usado una sola vez, sin significado de dominio) pueden quedarse en `camelCase` dentro de la propia función — no todo necesita salir a un fichero de constantes.

## 5. Tipos e interfaces

- Uso de TypeScript estricto (`strict: true` en `tsconfig.json`). No se introduce `any` salvo justificación explícita en comentario.
- Interfaces y tipos en PascalCase, en archivos `<algo>.types.ts` cuando se comparten entre módulos.

## 6. Organización general

- Nada de lógica de negocio dentro de `extension.ts` más allá de orquestar: leer el estado, invocar el servicio/clase correspondiente, actualizar la UI de VS Code.
- Acceso a la API de DeepSeek y al API de Git de VS Code encapsulado en clases dedicadas, nunca llamadas HTTP o de la API de Git dispersas en el manejador de comandos.

## 7. Documentación (JSDoc) y comentarios

- Todo elemento exportado (clase, método público, función, tipo) lleva JSDoc en **inglés**, con todas sus propiedades requeridas documentadas.
- El JSDoc documenta cada propiedad requerida: parámetros (`@param`), valor de retorno (`@returns`), y errores esperados (`@throws`) cuando aplique.
- **Todos los comentarios de código van en inglés, sin excepción** (JSDoc, comentarios de bloque, comentarios inline). Esto no incluye los textos de cara al usuario (mensajes de error o advertencias mostrados en VS Code), que pueden ir en español si así lo pide el producto.
- Los comentarios descriptivos (la línea de resumen del JSDoc, comentarios inline) son **cortos y en minúscula**, con lenguaje natural y directo — se explica qué hace o por qué existe, sin sobrecargar de jerga.
- No se documentan obviedades ya evidentes por el nombre de la función o variable.

## 8. Commits

- Formato: `<flag>: <mensaje corto en inglés>`, sin cuerpo ni pie de página.
- Flags permitidos: `add`, `modify`, `delete`, `fix`, `refactor`.
- Sin co-autores ni menciones de herramientas. Los commits van a nombre del usuario.

## 9. Antes de abrir un PR

- El código debe pasar `pnpm run typecheck` y `pnpm run lint` sin errores.
- Ningún archivo nuevo debe romper las convenciones anteriores; si una excepción es imprescindible, se justifica en el PR.
