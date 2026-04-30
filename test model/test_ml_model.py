import pickle
import pandas as pd
import os

# Set paths
DIR = os.path.dirname(os.path.abspath(__file__))

print("Loading ML models and preprocessors...")

# Load Encoders
with open(os.path.join(DIR, "encoders.pkl"), "rb") as f:
    encoders = pickle.load(f)

# Load Scaler
with open(os.path.join(DIR, "scaler.pkl"), "rb") as f:
    scaler = pickle.load(f)

# Load Classifier (Spoilage)
with open(os.path.join(DIR, "spoilage_model.pkl"), "rb") as f:
    clf = pickle.load(f)

# Load Regressor (Shelf Life)
with open(os.path.join(DIR, "shelf_life_model.pkl"), "rb") as f:
    reg = pickle.load(f)

print("All components loaded successfully!\n")

CATEGORICAL = ['vegetable_type', 'storage_condition', 'packaging_type']
NUMERICAL   = ['storage_temp_c', 'temp_deviation_c', 'humidity_pct',
                'damage_score', 'microbial_load_log_cfu', 'ethylene_ppm']
FEATURE_COLS = NUMERICAL + CATEGORICAL

def predict_vegetable_health(input_dict):
    """
    Takes raw dictionary input, returns spoilage prediction + shelf life.
    """
    df_in = pd.DataFrame([input_dict])

    # Encode categoricals
    for col in CATEGORICAL:
        df_in[col] = encoders[col].transform(df_in[col])

    # Scale numericals
    df_in[NUMERICAL] = scaler.transform(df_in[NUMERICAL])

    X_in = df_in[FEATURE_COLS]

    spoilage   = int(clf.predict(X_in)[0])
    confidence = round(float(clf.predict_proba(X_in)[0][spoilage]) * 100, 2)
    days       = round(float(reg.predict(X_in)[0]), 1)

    return {
        "spoilage_status": spoilage,
        "spoilage_label" : "Spoiled" if spoilage == 1 else "Fresh",
        "days_good"      : days,
        "confidence_pct" : confidence
    }

# ==========================
# Run Test Cases
# ==========================

test_cases = [
    {
        "label": "Test 1: Perfectly Stored Tomato (Cold Storage, Vacuum Pack)",
        "input": {
            "storage_temp_c": 4.0, "temp_deviation_c": 0.1,
            "humidity_pct": 85.0, "damage_score": 0.5,
            "microbial_load_log_cfu": 1.2, "ethylene_ppm": 0.1,
            "vegetable_type": "tomato",
            "storage_condition": "cold_storage",
            "packaging_type": "vacuum_pack"
        }
    },
    {
        "label": "Test 2: Damaged Spinach left in Ambient Temperature",
        "input": {
            "storage_temp_c": 30.0, "temp_deviation_c": 15.0,
            "humidity_pct": 95.0, "damage_score": 8.5,
            "microbial_load_log_cfu": 7.5, "ethylene_ppm": 5.0,
            "vegetable_type": "spinach",
            "storage_condition": "ambient",
            "packaging_type": "loose"
        }
    },
    {
        "label": "Test 3: Carrot in Refrigerated Storage with slight temp deviation",
        "input": {
            "storage_temp_c": 10.0, "temp_deviation_c": 4.0,
            "humidity_pct": 80.0, "damage_score": 2.0,
            "microbial_load_log_cfu": 3.0, "ethylene_ppm": 1.5,
            "vegetable_type": "carrot",
            "storage_condition": "refrigerated",
            "packaging_type": "crate"
        }
    }
]

print("Running Predictions...")
print("-" * 40)

for tc in test_cases:
    result = predict_vegetable_health(tc["input"])
    print(f"\n{tc['label']}")
    print("Input parameters:", tc["input"])
    print(f"--> Status     : {result['spoilage_label']} (Class {result['spoilage_status']})")
    print(f"--> Days Good  : {result['days_good']} days remaining")
    print(f"--> Confidence : {result['confidence_pct']}%")
