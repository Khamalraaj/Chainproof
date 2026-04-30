import sys
import json
import pickle
import pandas as pd
import os
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

DIR = r"/Users/aadipranav.s/Downloads/chainproof-backend/test model"

# Load ML models and preprocessors once
try:
    with open(os.path.join(DIR, "encoders.pkl"), "rb") as f:
        encoders = pickle.load(f)
    with open(os.path.join(DIR, "scaler.pkl"), "rb") as f:
        scaler = pickle.load(f)
    with open(os.path.join(DIR, "spoilage_model.pkl"), "rb") as f:
        clf = pickle.load(f)
    with open(os.path.join(DIR, "shelf_life_model.pkl"), "rb") as f:
        reg = pickle.load(f)
except Exception as e:
    print(json.dumps({"error": f"Model load error: {str(e)}"}))
    sys.exit(1)

CATEGORICAL = ['vegetable_type', 'storage_condition', 'packaging_type']
NUMERICAL   = ['storage_temp_c', 'temp_deviation_c', 'humidity_pct',
                'damage_score', 'microbial_load_log_cfu', 'ethylene_ppm']
FEATURE_COLS = NUMERICAL + CATEGORICAL

def predict_health(input_dict):
    # Smart defaults for missing data
    defaults = {
        "storage_condition": "refrigerated",
        "packaging_type": "crate",
        "temp_deviation_c": 1.0,
        "humidity_pct": 85.0,
        "damage_score": 0.5,
        "microbial_load_log_cfu": 2.5,
        "ethylene_ppm": 1.5
    }
    
    for key, val in defaults.items():
        if key not in input_dict or input_dict[key] is None:
            input_dict[key] = val

    # Logic to adjust storage condition based on temp if not provided
    temp = input_dict.get('storage_temp_c', 4.0)
    if temp > 15:
        input_dict["storage_condition"] = "ambient"
    elif temp <= 4:
        input_dict["storage_condition"] = "cold_storage"

    df_in = pd.DataFrame([input_dict])
    
    for col in CATEGORICAL:
        df_in[col] = encoders[col].transform(df_in[col])
    
    df_in[NUMERICAL] = scaler.transform(df_in[NUMERICAL])
    X_in = df_in[FEATURE_COLS]
    
    spoilage_status = int(clf.predict(X_in)[0])
    confidence = round(float(clf.predict_proba(X_in)[0][spoilage_status]) * 100, 2)
    days_remaining = round(float(reg.predict(X_in)[0]), 1)
    
    return {
        "spoilage_status": spoilage_status,
        "spoilage_label" : "Spoiled" if spoilage_status == 1 else "Fresh",
        "days_remaining" : days_remaining,
        "confidence_pct" : confidence
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)
        
    try:
        input_data = json.loads(sys.argv[1])
        result = predict_health(input_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
