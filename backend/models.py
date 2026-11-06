from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel, ConfigDict
from .database import Base

# =====================================================================
# SQLAlchemy Models
# =====================================================================

class Flight(Base):
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)
    flight_number = Column(String, unique=True, index=True, nullable=False)
    airline = Column(String, nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure_time = Column(DateTime, nullable=False)
    arrival_time = Column(DateTime, nullable=False)

    crew = relationship("CrewMember", back_populates="flight", cascade="all, delete-orphan")
    passengers = relationship("Passenger", back_populates="flight", cascade="all, delete-orphan")


class CrewMember(Base):
    __tablename__ = "crew_members"

    id = Column(Integer, primary_key=True, index=True)
    flight_id = Column(Integer, ForeignKey("flights.id", ondelete="CASCADE"), nullable=False)
    passport = Column(String, nullable=False)
    name = Column(String, nullable=False)
    nationality = Column(String, nullable=False)
    role = Column(String, nullable=False) # e.g. Capitán, Primer Oficial, Azafata

    flight = relationship("Flight", back_populates="crew")


class Passenger(Base):
    __tablename__ = "passengers"

    id = Column(Integer, primary_key=True, index=True)
    flight_id = Column(Integer, ForeignKey("flights.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    nationality = Column(String, nullable=False)
    seat = Column(String, nullable=False)
    passport = Column(String, nullable=False)

    flight = relationship("Flight", back_populates="passengers")


# =====================================================================
# Pydantic Schemas for validation & serialization
# =====================================================================

class CrewMemberBase(BaseModel):
    passport: str
    name: str
    nationality: str
    role: str

class CrewMemberCreate(CrewMemberBase):
    pass

class CrewMemberOut(CrewMemberBase):
    id: int
    flight_id: int
    model_config = ConfigDict(from_attributes=True)


class PassengerBase(BaseModel):
    first_name: str
    last_name: str
    nationality: str
    seat: str
    passport: str

class PassengerCreate(PassengerBase):
    pass

class PassengerOut(PassengerBase):
    id: int
    flight_id: int
    model_config = ConfigDict(from_attributes=True)


class FlightBase(BaseModel):
    flight_number: str
    airline: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime

class FlightCreate(FlightBase):
    crew: List[CrewMemberCreate] = []
    passengers: List[PassengerCreate] = []

class FlightOut(FlightBase):
    id: int
    crew: List[CrewMemberOut] = []
    passengers: List[PassengerOut] = []
    model_config = ConfigDict(from_attributes=True)
