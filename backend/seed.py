from datetime import datetime
from sqlalchemy.orm import Session
from .database import engine, Base
from .models import Flight, CrewMember, Passenger

def seed_data(db: Session):
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Check if there is already data in the flights table
    if db.query(Flight).count() > 0:
        print("Database already contains data, skipping seed.")
        return

    print("Seeding database with Caso 4 default flight...")
    
    # Create the flight
    flight = Flight(
        flight_number="200130012",
        airline="Aerovías",
        origin="Guatemala",
        destination="España",
        departure_time=datetime(2013, 5, 12, 8, 30),
        arrival_time=datetime(2013, 5, 12, 21, 0)
    )
    db.add(flight)
    db.flush() # Populate flight.id
    
    # Add crew members
    crew = [
        CrewMember(flight_id=flight.id, passport="3912022", name="Julio Juárez", nationality="Guatemalteca", role="Capitán"),
        CrewMember(flight_id=flight.id, passport="2218723", name="Mario Ramírez", nationality="Hondureña", role="Primer Oficial"),
        CrewMember(flight_id=flight.id, passport="4333212", name="Rodrigo Ubeda", nationality="Guatemalteca", role="Segundo Oficial"),
        CrewMember(flight_id=flight.id, passport="2211234", name="Maya Rodríguez", nationality="Guatemalteca", role="Azafata"),
        CrewMember(flight_id=flight.id, passport="5689775", name="María Valenzuela", nationality="Salvadoreña", role="Azafata"),
        CrewMember(flight_id=flight.id, passport="3422212", name="Josefina López", nationality="Guatemalteca", role="Azafata")
    ]
    db.bulk_save_objects(crew)
    
    # Add passengers
    passengers = [
        Passenger(flight_id=flight.id, first_name="María del Rosario", last_name="Álvarez", nationality="Guatemalteca", seat="24", passport="918273"),
        Passenger(flight_id=flight.id, first_name="Juan de Dios", last_name="García", nationality="Española", seat="27", passport="1234421"),
        Passenger(flight_id=flight.id, first_name="José María", last_name="Santander", nationality="Española", seat="26", passport="2122134")
    ]
    db.bulk_save_objects(passengers)
    
    db.commit()
    print("Database seeding completed.")
