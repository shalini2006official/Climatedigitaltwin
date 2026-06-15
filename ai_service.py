def calculate_risk(temp, humidity):

    score = 0

    if temp > 30:
        score += 30

    if humidity > 70:
        score += 20

    if score < 30:
        level = "Low"
    elif score < 60:
        level = "Medium"
    else:
        level = "High"

    return {
        "temperature": temp,
        "humidity": humidity,
        "risk_score": score,
        "risk_level": level
    }