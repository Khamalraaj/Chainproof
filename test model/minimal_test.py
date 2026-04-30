import pickle
import pandas as pd
import os
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')

DIR = r"S:\log iq\files (2)"

print("Loading ML models and preprocessors...")

with open(os.path.join(DIR, "encoders.pkl"), "rb") as f:
    encoders = pickle.load(f)
with open(os.path.join(DIR, "scaler.pkl"), "rb") as f:
    scaler = pickle.load(f)
with open(os.path.join(DIR, "spoilage_model.pkl"), "rb") as f:
    clf = pickle.load(f)
with open(os.path.join(DIR, "shelf_life_model.pkl"), "rb") as f:
    reg = pickle.load(f)

VEGETABLES = list(encoders['vegetable_type'].classes_)
CATEGORICAL = ['vegetable_type', 'storage_condition', 'packaging_type']
NUMERICAL   = ['storage_temp_c', 'temp_deviation_c', 'humidity_pct',
                'damage_score', 'microbial_load_log_cfu', 'ethylene_ppm']
FEATURE_COLS = NUMERICAL + CATEGORICAL

def predict_vegetable_health(input_dict):
    df_in = pd.DataFrame([input_dict])
    for col in CATEGORICAL:
        df_in[col] = encoders[col].transform(df_in[col])
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

def get_minimal_input():
    print("\n" + "="*55)
    print(" 🚀 MINIMAL TEST (Secondary variables auto-filled)")
    print("="*55)
    
    # Baseline smart defaults
    input_data = {
        "storage_condition": "refrigerated",
        "packaging_type": "crate",
        "temp_deviation_c": 1.0,
        "humidity_pct": 85.0,
        "microbial_load_log_cfu": 2.5,
        "ethylene_ppm": 1.5
    }
    
    # 1. Vegetable
    while True:
        val = input(f"1. Vegetable Type (e.g., tomato, spinach): ").strip().lower()
        if val in VEGETABLES:
            input_data["vegetable_type"] = val
            break
        print(f"❌ Valid options: {', '.join(VEGETABLES)}")

    # 2. Temperature
    while True:
        try:
            val = float(input("2. Storage Temp (°C): ").strip())
            input_data["storage_temp_c"] = val
            
            # Automatically adjust storage condition based on temperature input
            if val > 15:
                input_data["storage_condition"] = "ambient"
            elif val <= 4:
                input_data["storage_condition"] = "cold_storage"
            break
        except ValueError:
            print("❌ Enter a number.")

    # 3. Damage
    while True:
        try:
            val = float(input("3. Damage Score (0=Perfect, 10=Destroyed): ").strip())
            if 0.0 <= val <= 10.0:
                input_data["damage_score"] = val
                
                # Automatically increase microbial load if heavily damaged
                if val >= 5:
                    input_data["microbial_load_log_cfu"] = 5.0 + (val/2)
                break
            else:
                print("❌ Enter a score between 0 and 10.")
        except ValueError:
            print("❌ Enter a number.")

    return input_data

print("Models loaded successfully!\n")

while True:
    test_input = get_minimal_input()
    
    print("\n" + "-" * 55)
    print(" 🧠 ML PREDICTION:")
    try:
        res = predict_vegetable_health(test_input)
        
        status_color = "\033[91m" if res['spoilage_status'] == 1 else "\033[92m"
        reset_color = "\033[0m"
        
        print(f"  Status        : {status_color}{res['spoilage_label']}{reset_color}")
        print(f"  Days Good     : {res['days_good']} days remaining")
        print(f"  Confidence    : {res['confidence_pct']}%")
        print("\n  (Note: Packaging, humidity, microbial load, and ethylene \n   were dynamically auto-filled based on your core inputs)")
    except Exception as e:
        print("  Error making prediction:", e)
        
    print("=" * 55)
    choice = input("\nPress ENTER to try another, or type 'q' to quit: ")
    if choice.strip().lower() == 'q':
        print("Exiting...")
        break
