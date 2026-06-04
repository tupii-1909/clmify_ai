"""
Stress Analysis HTTP Server
Run: python stress_server.py
Access: http://<your-ip>:5000/analyze
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow Android app to connect cross-origin

# ─────────────────────────────────────────────
#  Stress Index Formula
#  Stress Index = (HR×0.5) + ((100−HRV)×0.3) + (Temp_norm×0.2)
# ─────────────────────────────────────────────

def normalize_temp(temp: float) -> float:
    """Normalize temperature to a 0–100 scale centered on 37°C."""
    baseline = 37.0
    deviation = abs(temp - baseline)
    return min(deviation * 20, 100)  # scale: 0.1°C deviation → 2 points


def calculate_stress_index(hr: float, hrv: float, temp: float) -> float:
    temp_norm = normalize_temp(temp)
    index = (hr * 0.5) + ((100 - hrv) * 0.3) + (temp_norm * 0.2)
    return round(index, 2)


# ─────────────────────────────────────────────
#  Age-based thresholds
# ─────────────────────────────────────────────

def get_thresholds(age: int) -> dict:
    if 16 <= age <= 25:
        return {
            "hr":  {"low": (60, 80),  "medium": (81, 100),  "high": 101},
            "hrv": {"low": (55, 100), "medium": (40, 54),   "high": 40},
            "temp":{"low": (36.1, 37.2), "medium": (37.3, 37.8), "high": 37.8},
        }
    elif 26 <= age <= 45:
        return {
            "hr":  {"low": (60, 85),  "medium": (86, 105),  "high": 106},
            "hrv": {"low": (45, 90),  "medium": (30, 44),   "high": 30},
            "temp":{"low": (36.1, 37.2), "medium": (37.3, 37.8), "high": 37.8},
        }
    else:  # 45+
        return {
            "hr":  {"low": (60, 90),  "medium": (91, 110),  "high": 111},
            "hrv": {"low": (25, 60),  "medium": (20, 24),   "high": 20},
            "temp":{"low": (36.1, 37.2), "medium": (37.3, 37.8), "high": 37.8},
        }


def classify_parameter(value: float, thresholds: dict, param: str) -> str:
    t = thresholds[param]
    if param == "hrv":
        # HRV: higher is better (low stress = high HRV)
        if value >= t["low"][0]:
            return "Low"
        elif value >= t["medium"][0]:
            return "Medium"
        else:
            return "High"
    else:
        # HR and Temp: lower is better
        if t["low"][0] <= value <= t["low"][1]:
            return "Low"
        elif t["medium"][0] <= value <= t["medium"][1]:
            return "Medium"
        else:
            return "High"


def overall_stress_level(stress_index: float) -> str:
    if stress_index < 45:
        return "Low"
    elif stress_index < 70:
        return "Medium"
    else:
        return "High"


def stress_advice(level: str) -> str:
    advice = {
        "Low":    "You are in a calm state. Keep up your healthy habits!",
        "Medium": "Moderate stress detected. Try deep breathing or a short walk.",
        "High":   "High stress detected. Please rest, hydrate, and consider relaxation techniques.",
    }
    return advice.get(level, "")


# ─────────────────────────────────────────────
#  Routes
# ─────────────────────────────────────────────

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "running",
        "message": "Stress Analysis API is active",
        "endpoints": {
            "POST /analyze": "Send HR, HRV, Temp, Age → get stress analysis",
            "GET  /health":  "Server health check",
        }
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()

    # ── Validate input ──────────────────────────────
    required = ["hr", "hrv", "temp", "age"]
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        hr   = float(data["hr"])
        hrv  = float(data["hrv"])
        temp = float(data["temp"])
        age  = int(data["age"])
    except ValueError:
        return jsonify({"error": "All fields must be numeric"}), 400

    # ── Sanity bounds ───────────────────────────────
    if not (30 <= hr <= 220):
        return jsonify({"error": "HR must be between 30–220 BPM"}), 400
    if not (1 <= hrv <= 200):
        return jsonify({"error": "HRV must be between 1–200 ms"}), 400
    if not (34.0 <= temp <= 42.0):
        return jsonify({"error": "Temp must be between 34.0–42.0 °C"}), 400
    if not (10 <= age <= 120):
        return jsonify({"error": "Age must be between 10–120"}), 400

    # ── Compute ─────────────────────────────────────
    thresholds    = get_thresholds(age)
    stress_index  = calculate_stress_index(hr, hrv, temp)
    overall_level = overall_stress_level(stress_index)

    hr_status   = classify_parameter(hr,   thresholds, "hr")
    hrv_status  = classify_parameter(hrv,  thresholds, "hrv")
    temp_status = classify_parameter(temp, thresholds, "temp")

    age_group = (
        "16–25" if age <= 25 else
        "26–45" if age <= 45 else "45+"
    )

    response = {
        "input": {
            "hr":   hr,
            "hrv":  hrv,
            "temp": temp,
            "age":  age,
        },
        "age_group":     age_group,
        "stress_index":  stress_index,
        "stress_level":  overall_level,
        "advice":        stress_advice(overall_level),
        "parameter_status": {
            "hr":   hr_status,
            "hrv":  hrv_status,
            "temp": temp_status,
        },
        "formula_breakdown": {
            "hr_component":   round(hr * 0.5, 2),
            "hrv_component":  round((100 - hrv) * 0.3, 2),
            "temp_component": round(normalize_temp(temp) * 0.2, 2),
        }
    }

    return jsonify(response), 200


# ─────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"\n✅  Stress Analysis Server running!")
    print(f"    Local:    http://127.0.0.1:5000")
    print(f"    Network:  http://{local_ip}:5000")
    print(f"    Endpoint: POST /analyze\n")
    app.run(host="0.0.0.0", port=5000, debug=True)