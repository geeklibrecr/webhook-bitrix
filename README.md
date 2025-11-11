# Webhook Bitrix + Cola de Impresión

Servicio Node.js/Express para recibir webhooks de Bitrix24, almacenar el payload en MongoDB Atlas, encolar los FIELDS para impresión de etiquetas y exponer endpoints REST con documentación Swagger.

## Requisitos
- Node.js 18+
- MongoDB Atlas (cadena `mongodb+srv://...`)

## Configuración
Crea un archivo `.env` en la raíz con al menos:
- `PORT=3000`
- `MONGODB_URI=<tu_cadena_de_conexion_de_atlas>`
- `MONGODB_DB=webhookbitrix` (opcional; por defecto `webhookbitrix`)
- `QR_LINK_BASE=https://dev.example.com/bitrix/deal` (opcional; base del enlace usado en el QR)
- `BITRIX_SECRET=<opcional>` (si luego agregas validación de firma)

## Instalación
- `npm install`

## Ejecutar
- `node app.js`
- Swagger disponible en: `http://localhost:3000/api-docs`

## Endpoints principales
- `POST /webhook`
  - Recibe el payload de Bitrix24. Ejemplo mínimo:
    {
      "event": "ONCRMDEALUPDATE",
      "data": { "FIELDS": { "ID": "123", "TITLE": "Negocio demo" } }
    }
  - Almacena en la colección `webhookevents` y crea un item en `cola_impresion` con estado `pendiente`.
  - Respuesta incluye `id` (WebhookEvent) y `queueId` (ítem en cola).

- `GET /printqueue?status=pendiente|procesando|impreso|error`
  - Lista los ítems encolados (filtra por estado si se envía).

- `PATCH /printqueue/{id}/status`
  - Body: `{ "status": "pendiente|procesando|impreso|error" }`
  - Actualiza el estado de un ítem en cola.

- `POST /printqueue/imprimir/{id}`
  - Genera HTML de etiqueta imprimible (100mm x 50mm) con datos clave, QR y enlace.
  - Marca el ítem como `impreso`.

## Documentación Swagger
- Ruta: `/api-docs`
- Archivo fuente: `swagger.yaml`

## Modelos (Mongoose)
- `models/WebhookEvent.js`
  - `{ event, payload, fields, status, createdAt, updatedAt }`
  - `status`: `received|processed|failed` (por defecto `received`)
- `models/PrintQueueItem.js` (colección `cola_impresion`)
  - `{ fields, status, webhookEvent, createdAt, updatedAt }`
  - `status`: `pendiente|procesando|impreso|error` (por defecto `pendiente`)

## Flujo
1. Bitrix envía webhook -> `POST /webhook`.
2. Se guarda `WebhookEvent` y se crea `PrintQueueItem` con `fields` normalizados.
3. Se puede listar/filtrar la cola, actualizar estados y “imprimir” un ítem para obtener la etiqueta.

## Personalización de la etiqueta
- Plantilla HTML: `controllers/printQueueController.js` (buscar `const html = \``)
- Tamaño/estilos: bloque `<style>` dentro de la plantilla.
- Enlace base para QR: variable `QR_LINK_BASE` o `process.env.QR_LINK_BASE`.

## Utilidades
- Normalización de FIELDS: `utils/bitrixFields.js` (controla qué campos se pre-rellenan con `null`).

## Notas de seguridad
- No expongas `/api-docs` en producción sin protección.
- Considera validar autenticidad del webhook (HMAC, token o allowlist de IPs).
- Evita loguear payloads sensibles en producción.

## Pruebas rápidas
- Enviar ejemplo:
  curl -X POST http://localhost:3000/webhook \
    -H "Content-Type: application/json" \
    -d '{"event":"TEST","data":{"FIELDS":{"ID":"1","TITLE":"Demo"}}}'
- Listar pendientes: `curl http://localhost:3000/printqueue?status=pendiente`
- Imprimir: `curl -X POST http://localhost:3000/printqueue/imprimir/<queueId>`

