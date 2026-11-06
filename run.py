import os
import sys
import subprocess

def install_dependencies():
    print("Verificando dependencias...")
    try:
        import fastapi
        import uvicorn
        import sqlalchemy
        print("Dependencias ya instaladas.")
    except ImportError:
        print("Instalando dependencias desde requirements.txt...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("Dependencias instaladas con éxito.")
        except Exception as e:
            print(f"Error al instalar dependencias: {e}")
            sys.exit(1)

if __name__ == "__main__":
    # Ensure dependencies are installed
    install_dependencies()

    port = int(os.environ.get("PORT", 8000))
    is_dev = os.environ.get("PORT") is None

    print(f"Iniciando AereoSur Server en puerto {port}...")
    if is_dev:
        print(f"Accede a la interfaz web en: http://localhost:{port}")
    
    # Import uvicorn locally to prevent import issues before installation
    import uvicorn
    # Run the server
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=is_dev)
