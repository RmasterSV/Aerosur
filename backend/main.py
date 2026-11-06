import os
from datetime import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import get_db, engine, Base
from .models import (
    Flight, CrewMember, Passenger,
    FlightCreate, FlightOut,
    CrewMemberCreate, CrewMemberOut,
    PassengerCreate, PassengerOut
)
from .seed import seed_data

# Create FastAPI app
app = FastAPI(title="AereoSur Flight Management API", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and seed data on startup
@app.on_event("startup")
def startup_event():
    # Make sure DB schema is created
    Base.metadata.create_all(bind=engine)
    # Seed data
    db = next(get_db())
    try:
        seed_data(db)
    finally:
        db.close()

# =====================================================================
# Business Rules & Capacities
# =====================================================================

ROLE_LIMITS = {
    "Capitán": 1,
    "Primer Oficial": 1,
    "Segundo Oficial": 1,
    "Comisario de Bordo": 1,
    "Azafata": 4,
}
MAX_TOTAL_CREW = 8
MAX_PASSENGERS = 30

def check_flight_modifiable(flight: Flight, action: str = "modificar"):
    now = datetime.now()
    if flight.departure_time <= now <= flight.arrival_time:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede {action} en este vuelo porque está en curso (en vuelo). Las puertas y el manifiesto están cerrados."
        )
    elif now > flight.arrival_time:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede {action} en este vuelo porque ya ha finalizado su recorrido (aterrizó). El registro histórico está cerrado."
        )

def validate_crew_data(db: Session, flight_id: int, role: str, passport: str):
    role = role.strip()
    passport = passport.strip()

    if role not in ROLE_LIMITS:
        valid_roles = ", ".join(ROLE_LIMITS.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Puesto '{role}' no válido. Los puestos permitidos son: {valid_roles}."
        )

    current_crew = db.query(CrewMember).filter(CrewMember.flight_id == flight_id).all()

    if len(current_crew) >= MAX_TOTAL_CREW:
        raise HTTPException(
            status_code=400,
            detail=f"La tripulación de este vuelo está completa (máximo {MAX_TOTAL_CREW} tripulantes)."
        )

    role_count = sum(1 for c in current_crew if c.role.strip().lower() == role.lower())
    limit = ROLE_LIMITS[role]
    if role_count >= limit:
        if limit == 1:
            raise HTTPException(
                status_code=400,
                detail=f"Este vuelo ya cuenta con un {role} asignado. Solo se permite 1 {role} por vuelo."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Límite alcanzado: este vuelo ya tiene {limit} {role}s asignadas (máximo permitido: {limit})."
            )

    if any(c.passport.strip() == passport for c in current_crew):
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un tripulante con el pasaporte '{passport}' en este vuelo."
        )

    existing_passenger = db.query(Passenger).filter(
        Passenger.flight_id == flight_id,
        Passenger.passport == passport
    ).first()
    if existing_passenger:
        raise HTTPException(
            status_code=400,
            detail=f"El pasaporte '{passport}' ya se encuentra registrado como pasajero en este vuelo."
        )

def validate_passenger_data(db: Session, flight_id: int, seat: str, passport: str):
    seat = str(seat).strip()
    passport = passport.strip()

    if not seat.isdigit() or int(seat) < 1 or int(seat) > MAX_PASSENGERS:
        raise HTTPException(
            status_code=400,
            detail=f"Número de asiento '{seat}' no válido. Debe ser un número entre el 1 y el {MAX_PASSENGERS}."
        )

    total_passengers = db.query(Passenger).filter(Passenger.flight_id == flight_id).count()
    if total_passengers >= MAX_PASSENGERS:
        raise HTTPException(
            status_code=400,
            detail=f"El vuelo ha alcanzado su capacidad máxima ({MAX_PASSENGERS} pasajeros a bordo)."
        )

    seat_taken = db.query(Passenger).filter(
        Passenger.flight_id == flight_id,
        Passenger.seat == seat
    ).first()
    if seat_taken:
        raise HTTPException(
            status_code=400,
            detail=f"El asiento {seat} ya está ocupado en este vuelo."
        )

    passport_taken = db.query(Passenger).filter(
        Passenger.flight_id == flight_id,
        Passenger.passport == passport
    ).first()
    if passport_taken:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un pasajero registrado con el pasaporte '{passport}' en este vuelo."
        )

    crew_taken = db.query(CrewMember).filter(
        CrewMember.flight_id == flight_id,
        CrewMember.passport == passport
    ).first()
    if crew_taken:
        raise HTTPException(
            status_code=400,
            detail=f"El pasaporte '{passport}' ya pertenece a un miembro de la tripulación en este vuelo."
        )

# =====================================================================
# API Endpoints
# =====================================================================

@app.get("/api/flights", response_model=List[FlightOut])
def get_flights(db: Session = Depends(get_db)):
    flights = db.query(Flight).order_by(Flight.departure_time.asc()).all()
    return flights

@app.get("/api/flights/{flight_id}", response_model=FlightOut)
def get_flight(flight_id: int, db: Session = Depends(get_db)):
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight

@app.post("/api/flights", response_model=FlightOut, status_code=status.HTTP_201_CREATED)
def create_flight(flight_data: FlightCreate, db: Session = Depends(get_db)):
    flight_number = flight_data.flight_number.strip()
    origin = flight_data.origin.strip()
    destination = flight_data.destination.strip()

    if origin.lower() == destination.lower():
        raise HTTPException(
            status_code=400,
            detail="El país de destino no puede ser igual al país de origen."
        )

    if flight_data.arrival_time <= flight_data.departure_time:
        raise HTTPException(
            status_code=400,
            detail="La fecha y hora de llegada debe ser posterior a la fecha y hora de salida."
        )

    existing = db.query(Flight).filter(Flight.flight_number == flight_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"El número de vuelo '{flight_number}' ya está registrado.")

    new_flight = Flight(
        flight_number=flight_number,
        airline=flight_data.airline.strip(),
        origin=origin,
        destination=destination,
        departure_time=flight_data.departure_time,
        arrival_time=flight_data.arrival_time
    )
    db.add(new_flight)
    db.flush() # get new_flight.id

    # Add crew members if any
    for c in flight_data.crew:
        validate_crew_data(db, new_flight.id, c.role, c.passport)
        db.add(CrewMember(
            flight_id=new_flight.id,
            passport=c.passport.strip(),
            name=c.name.strip(),
            nationality=c.nationality.strip(),
            role=c.role.strip()
        ))
        db.flush()

    # Add passengers if any
    for p in flight_data.passengers:
        validate_passenger_data(db, new_flight.id, p.seat, p.passport)
        db.add(Passenger(
            flight_id=new_flight.id,
            first_name=p.first_name.strip(),
            last_name=p.last_name.strip(),
            nationality=p.nationality.strip(),
            seat=p.seat.strip(),
            passport=p.passport.strip()
        ))
        db.flush()

    db.commit()
    db.refresh(new_flight)
    return new_flight

@app.delete("/api/flights/{flight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flight(flight_id: int, db: Session = Depends(get_db)):
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    db.delete(flight)
    db.commit()
    return None

# Crew endpoints
@app.post("/api/flights/{flight_id}/crew", response_model=CrewMemberOut, status_code=status.HTTP_201_CREATED)
def add_crew_member(flight_id: int, crew_data: CrewMemberCreate, db: Session = Depends(get_db)):
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Vuelo no encontrado")

    check_flight_modifiable(flight, action="agregar tripulantes")
    validate_crew_data(db, flight_id, crew_data.role, crew_data.passport)

    new_crew = CrewMember(
        flight_id=flight_id,
        passport=crew_data.passport.strip(),
        name=crew_data.name.strip(),
        nationality=crew_data.nationality.strip(),
        role=crew_data.role.strip()
    )
    db.add(new_crew)
    db.commit()
    db.refresh(new_crew)
    return new_crew

@app.delete("/api/crew/{crew_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crew_member(crew_id: int, db: Session = Depends(get_db)):
    crew = db.query(CrewMember).filter(CrewMember.id == crew_id).first()
    if not crew:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    flight = db.query(Flight).filter(Flight.id == crew.flight_id).first()
    if flight:
        check_flight_modifiable(flight, action="eliminar tripulantes")

    db.delete(crew)
    db.commit()
    return None

# Passenger endpoints
@app.post("/api/flights/{flight_id}/passengers", response_model=PassengerOut, status_code=status.HTTP_201_CREATED)
def add_passenger(flight_id: int, passenger_data: PassengerCreate, db: Session = Depends(get_db)):
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Vuelo no encontrado")

    check_flight_modifiable(flight, action="agregar pasajeros")
    validate_passenger_data(db, flight_id, passenger_data.seat, passenger_data.passport)

    new_passenger = Passenger(
        flight_id=flight_id,
        first_name=passenger_data.first_name.strip(),
        last_name=passenger_data.last_name.strip(),
        nationality=passenger_data.nationality.strip(),
        seat=passenger_data.seat.strip(),
        passport=passenger_data.passport.strip()
    )
    db.add(new_passenger)
    db.commit()
    db.refresh(new_passenger)
    return new_passenger

@app.delete("/api/passengers/{passenger_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_passenger(passenger_id: int, db: Session = Depends(get_db)):
    passenger = db.query(Passenger).filter(Passenger.id == passenger_id).first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found")
    
    flight = db.query(Flight).filter(Flight.id == passenger.flight_id).first()
    if flight:
        check_flight_modifiable(flight, action="eliminar pasajeros")

    db.delete(passenger)
    db.commit()
    return None

# =====================================================================
# Serve Frontend Static Files
# =====================================================================

# Ensure static directory exists
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

# Mount static files
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
