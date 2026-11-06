# AereoSur - Terminal de Control y Gestión de Vuelos

Sistema integral de gestión aeroportuaria para el monitoreo y administración de vuelos, tripulaciones, pasajeros y generación de manifiestos oficiales de vuelo en PDF (Caso 4).

---

## ✈️ Características Principales

### 1. Gestión de Vuelos
- **Registro y Consulta:** Administración completa de vuelos (número de vuelo, aerolínea, origen, destino, fecha y hora de salida y llegada).
- **Validaciones de Integridad Aeronáutica:**
  - El país de destino no puede ser igual al de origen.
  - La hora de llegada debe ser posterior a la hora de salida.
  - No se permiten números de vuelo duplicados.
- **Ciclo de Vida de Vuelo Dinámico:**
  - **Programado:** Permite registrar tripulación, asignar pasajeros y gestionar asientos.
  - **En Vuelo:** Al llegar la hora de salida, las puertas y el manifiesto quedan sellados automáticamente (bloqueo de altas y bajas).
  - **Finalizado (Aterrizó):** Registro histórico protegido con candado una vez completada la ruta.

### 2. Control de Tripulación
- **Límites estrictos por rol:**
  - **Capitán:** Máximo 1 por vuelo.
  - **Primer Oficial:** Máximo 1 por vuelo.
  - **Segundo Oficial:** Máximo 1 por vuelo.
  - **Comisario de Bordo:** Máximo 1 por vuelo.
  - **Azafata:** Máximo 4 por vuelo.
  - **Total de tripulación:** Máximo 8 tripulantes por vuelo.
- Verificación automática de pasaportes únicos (no duplicados dentro de la tripulación ni cruzados con pasajeros).
- Menú dinámico que muestra disponibilidad en tiempo real (e.g. `Capitán (1/1 - Cupo Lleno)`).

### 3. Pasajeros y Mapa de Cabina
- Capacidad máxima de **30 pasajeros** por aeronave.
- **Mapa interactivo de cabina:** Disposición realista de asientos (Filas 1 a 5 con pasillo central).
- Selección visual de asiento haciendo clic directamente en la cabina.
- Bloqueo automático de asientos ocupados y validación de pasaportes únicos.

### 4. Generación y Exportación de Manifiesto PDF
- Vista previa modal de alta definición con diseño formal según requerimientos oficiales.
- Descarga directa en PDF (`Manifiesto_Vuelo_XXXX.pdf`) y botón de impresión directa.
- Tipografía nítida en negro puro de alto contraste y tablas formateadas.

---

## 🛠️ Tecnologías Utilizadas

- **Backend:** Python 3.10+ / FastAPI / SQLAlchemy / SQLite / Uvicorn
- **Frontend:** HTML5 semántico, CSS3 moderno (Glassmorphism & Dark Aero Theme), JavaScript Vanilla (ES6+)
- **Librerías externas:** `html2pdf.js`, `lucide-icons`

---

## 🚀 Instalación y Puesta en Marcha

### Opción 1: Inicio Rápido (Recomendado en Windows)
Haz doble clic sobre el archivo:
```text
iniciar_servidor.bat
```
El script verificará Python, instalará dependencias si es necesario y levantará el servidor en `http://localhost:8000`.

### Opción 2: Desde la Terminal
1. Clona el repositorio:
   ```bash
   git clone https://github.com/RmasterSV/Aerosur.git
   cd Aerosur
   ```

2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

3. Inicia la aplicación:
   ```bash
   python run.py
   ```

4. Abre tu navegador web en:
   ```text
   http://localhost:8000
   ```

### Opción 3: Despliegue en Render (En la nube)
El proyecto incluye `render.yaml` preconfigurado para Render:
1. Inicia sesión en [render.com](https://render.com) (con tu cuenta de GitHub).
2. Haz clic en **New +** > **Web Service**.
3. Selecciona tu repositorio **`Aerosur`**.
4. Configuración del servicio:
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`
5. Haz clic en **Deploy Web Service** y obtendrás una URL pública `https://aerosur-xxxx.onrender.com` accesible desde cualquier dispositivo.

---

## 📂 Estructura del Proyecto

```text
aereosur_app/
├── backend/
│   ├── database.py       # Configuración de base de datos SQLite y SQLAlchemy
│   ├── models.py         # Modelos de datos y esquemas Pydantic
│   ├── seed.py           # Datos iniciales precargados (Caso 4)
│   └── main.py           # Endpoints de API y lógica de negocio
├── static/
│   ├── index.html        # Interfaz de usuario Single Page Application (SPA)
│   ├── styles.css        # Estilos, temas oscuro y diseño responsivo
│   └── app.js            # Lógica del cliente, llamadas API y mapa de cabina
├── render.yaml           # Configuración de despliegue en Render
├── iniciar_servidor.bat  # Script ejecutable de un clic para Windows
├── requirements.txt      # Dependencias del proyecto
└── run.py                # Punto de entrada y servidor Uvicorn
```
