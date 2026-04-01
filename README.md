# 7Flow

7Flow es una PWA de gestión personal de proyectos. Guarda todo en el navegador y está pensada para usarla como app móvil o de escritorio.

## Desarrollo

1. Instala dependencias:
   `npm install`
2. Levanta el entorno local:
   `npm run dev`

## Producción local

1. Compila la app:
   `npm run build`
2. Sirve el bundle compilado:
   `npm start`

## Docker

1. Construye la imagen:
   `docker build -t 7flow .`
2. Ejecuta el contenedor:
   `docker run -p 8080:8080 7flow`

## Google Cloud Run

1. Autentícate y selecciona tu proyecto:
   `gcloud auth login`
   `gcloud config set project PROJECT_ID`
2. Habilita los servicios necesarios:
   `gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com`
3. Despliega desde la carpeta del repo usando el `Dockerfile` incluido:
   `gcloud run deploy sevenflow --source . --region REGION --allow-unauthenticated`

Notas:

- `sevenflow` es un ejemplo válido de nombre de servicio. En Cloud Run, el servicio debe empezar con letra, así que `7flow` no sirve como nombre de servicio.
- No necesitas `gcloud builds submit` para este repo, porque Cloud Run usa el `Dockerfile` cuando haces despliegue desde fuente.
- La app escucha en `0.0.0.0:$PORT` y sirve el `dist`, así que ya está lista para Cloud Run.

## Nota

El contenido se persiste en `localStorage`, así que cada usuario mantiene sus propios datos en su navegador.
