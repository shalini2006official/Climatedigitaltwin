from pydantic import BaseModel

class WeatherResponse(BaseModel):
    city: str
    temperature: float
    humidity: float
    weather: str
    wind_speed: float


class RiskResponse(BaseModel):
    temperature: float
    humidity: float
    risk_level: str