def simulate_future(temp, humidity):

    return {
        "current_temperature": temp,
        "future_temperature": temp + 2.5,
        "current_humidity": humidity,
        "future_humidity": humidity + 5,
        "prediction_days": 7
    }