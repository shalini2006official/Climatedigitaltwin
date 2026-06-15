from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.services.weather_service import get_weather
from app.services.ai_service import calculate_risk
from app.services.simulation_service import simulate_future

from app.database import get_db
from app.models import WeatherHistory
from app.logger import logger
from sqlalchemy import func

router = APIRouter(
    prefix="",
    tags=["Climate APIs"]
)


@router.get("/weather/{city}")
def weather(city: str):

    logger.info(f"Weather requested for {city}")

    data = get_weather(city)

    return {
        "city": data["name"],
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "weather": data["weather"][0]["description"],
        "wind_speed": data["wind"]["speed"]
    }


@router.get("/risk/{city}")
def risk(city: str, db: Session = Depends(get_db)):

    logger.info(f"Risk analysis requested for {city}")

    data = get_weather(city)

    temp = data["main"]["temp"]
    humidity = data["main"]["humidity"]

    result = calculate_risk(temp, humidity)

    weather_record = WeatherHistory(
        city=city,
        temperature=temp,
        humidity=humidity,
        risk_level=result["risk_level"]
    )

    db.add(weather_record)
    db.commit()

    logger.info(
        f"Risk calculated: {result['risk_level']} for {city}"
    )

    return result


@router.get("/history")
def history(db: Session = Depends(get_db)):

    records = db.query(WeatherHistory).all()

    return records


@router.get("/history/{city}")
def city_history(city: str, db: Session = Depends(get_db)):

    return db.query(
        WeatherHistory
    ).filter(
        WeatherHistory.city == city
    ).all()


@router.get("/stats")
def stats(db: Session = Depends(get_db)):

    total_records = db.query(
        WeatherHistory
    ).count()

    avg_temp = db.query(
        func.avg(
            WeatherHistory.temperature
        )
    ).scalar()

    return {
        "total_records": total_records,
        "average_temperature": round(avg_temp, 2)
    }


@router.get("/simulate/{city}")
def simulate(city: str):

    data = get_weather(city)

    temp = data["main"]["temp"]
    humidity = data["main"]["humidity"]

    return simulate_future(temp, humidity)


@router.get("/alerts/{city}")
def alerts(city: str):

    data = get_weather(city)

    temp = data["main"]["temp"]

    if temp > 40:
        return {"alert": "High Heat Warning"}

    elif temp > 35:
        return {"alert": "Moderate Heat Warning"}

    return {"alert": "Safe"}


@router.get("/health")
def health():

    return {
        "status": "healthy",
        "database": "connected",
        "api": "running"
    }
@router.get("/insights")
def insights(db: Session = Depends(get_db)):

    total_records = db.query(
        WeatherHistory
    ).count()

    avg_temp = db.query(
        func.avg(WeatherHistory.temperature)
    ).scalar()

    max_temp = db.query(
        func.max(WeatherHistory.temperature)
    ).scalar()

    min_temp = db.query(
        func.min(WeatherHistory.temperature)
    ).scalar()

    return {
        "total_records": total_records,
        "average_temperature": round(avg_temp, 2),
        "highest_temperature": max_temp,
        "lowest_temperature": min_temp
    }