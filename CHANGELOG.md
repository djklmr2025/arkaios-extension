# Changelog
Todas las novedades de **ARKAIOS Lab Gateway – Chat Module**.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [SemVer](https://semver.org/lang/es/).

## [2.0.0] - 2025-10-06
### Añadido
- **Overlay** flotante con **resizer** y memoria de ancho por dominio (chrome.storage.local).
- Conmutador de **modo de apertura**: Panel / Ventana / Integrado (overlay).
- Acción **“Adjuntar a pestaña actual”**.
- Paquete **storepack** con archivos para publicación en Chrome Web Store.

### Corregido
- Cumplimiento de **CSP**: sin scripts inline (errores `script-src 'self'`).

### Seguridad/Permisos
- Permisos mínimos: `activeTab`, `downloads`, `scripting`, `storage`, `tabs`.
- `host_permissions` sugerido: limitar a sitios necesarios en lugar de `<all_urls>`.

---
## [1.x] - Historial
- Versiones previas internas.
