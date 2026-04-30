import pickle
import pandas as pd
import os
import random
import warnings

# Suppress warnings for cleaner terminal output
warnings.filterwarnings('ignore')

DIR = r"S:\log iq\files (2)"

print("Loading ML models and preprocessors...")

# Load models and preprocessors
with open(os.path.join(DIR, "encoders.pkl"), "rb") as f:
    encoders = pickle.load(f)
with open(os.path.join(DIR, "scaler.pkl"), "rb") as f:
    scaler = pickle.load(f)
with open(os.path.join(DIR, "spoilage_model.pkl"), "rb") as f:
    clf = pickle.load(f)
with open(os.path.join(DIR, "shelf_life_model.pkl"), "rb") as f:
    reg = pickle.load(f)

# Extract valid categorical options directly from the encoders
VEGETABLES = list(encoders['vegetable_type'].classes_)
CONDITIONS = list(encoders['storage_condition'].classes_)
PACKAGING = list(encoders['packaging_type'].classes_)

CATEGORICAL = ['vegetable_type', 'storage_condition', 'packaging_type']
NUMERICAL   = ['storage_temp_c', 'temp_deviation_c', 'humidity_pct',
                'damage_score', 'microbial_load_log_cfu', 'ethylene_ppm']
FEATURE_COLS = NUMERICAL + CATEGORICAL

def get_random_input():
    return {
        "storage_temp_c": round(random.uniform(2.0, 35.0), 1),
        "temp_deviation_c": round(random.uniform(0.0, 10.0), 1),
        "humidity_pct": round(random.uniform(40.0, 99.0), 1),
        "damage_score": round(random.uniform(0.0, 10.0), 1),
        "microbial_load_log_cfu": round(random.uniform(1.0, 9.0), 1),
        "ethylene_ppm": round(random.uniform(0.0, 8.0), 1),
        "vegetable_type": random.choice(VEGETABLES),
        "storage_condition": random.choice(CONDITIONS),
        "packaging_type": random.choice(PACKAGING)
    }

def predict_vegetable_health(input_dict):
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

print("Models loaded successfully!\n")

while True:
    print("=" * 50)
    print(" 🎲 GENERATING RANDOM SHIPMENT DATA...")
    print("=" * 50)
    
    test_input = get_random_input()
    for k, v in test_input.items():
        print(f"  {k:<25}: {v}")
    
    print("-" * 50)
    print(" 🧠 ML PREDICTION:")
    try:
        res = predict_vegetable_health(test_input)
        
        status_color = "\033[91m" if res['spoilage_status'] == 1 else "\033[92m" # Red or Green
        reset_color = "\033[0m"
        
        print(f"  Status        : {status_color}{res['spoilage_label']} (Class {res['spoilage_status']}){reset_color}")
        print(f"  Days Good     : {res['days_good']} days remaining")
        print(f"  Confidence    : {res['confidence_pct']}%")
    except Exception as e:
        print("  Error making prediction:", e)
        
    print("=" * 50)
    choice = input("\nPress ENTER to generate another random shipment (or type 'q' to quit): ")
    if choice.strip().lower() == 'q':
        print("Exiting test script...")
        break
