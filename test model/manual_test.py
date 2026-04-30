import pickle
import pandas as pd
import os
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

def get_manual_input():
    print("\n" + "="*50)
    print(" ✍️  ENTER SHIPMENT DATA")
    print("="*50)
    
    input_data = {}
    
    # Categoricals with validation
    while True:
        print(f"\nVegetable Types: {', '.join(VEGETABLES)}")
        val = input("1. Enter Vegetable Type: ").strip().lower()
        if val in VEGETABLES:
            input_data["vegetable_type"] = val
            break
        print("❌ Invalid option. Please type exactly one of the options listed.")

    while True:
        print(f"\nStorage Conditions: {', '.join(CONDITIONS)}")
        val = input("2. Enter Storage Condition: ").strip().lower()
        if val in CONDITIONS:
            input_data["storage_condition"] = val
            break
        print("❌ Invalid option.")

    while True:
        print(f"\nPackaging Types: {', '.join(PACKAGING)}")
        val = input("3. Enter Packaging Type: ").strip().lower()
        if val in PACKAGING:
            input_data["packaging_type"] = val
            break
        print("❌ Invalid option.")

    # Numericals with validation
    def get_float_input(prompt, min_val, max_val):
        while True:
            try:
                val = float(input(prompt).strip())
                if min_val <= val <= max_val:
                    return val
                else:
                    print(f"❌ Please enter a value between {min_val} and {max_val}.")
            except ValueError:
                print("❌ Please enter a valid number.")

    print("\n-- Numerical Metrics --")
    input_data["storage_temp_c"] = get_float_input("4. Storage Temp (°C) [-10 to 40]: ", -10.0, 40.0)
    input_data["temp_deviation_c"] = get_float_input("5. Temp Deviation (°C) [0 to 20]: ", 0.0, 20.0)
    input_data["humidity_pct"] = get_float_input("6. Humidity (%) [0 to 100]: ", 0.0, 100.0)
    input_data["damage_score"] = get_float_input("7. Physical Damage Score [0 (none) to 10 (severe)]: ", 0.0, 10.0)
    input_data["microbial_load_log_cfu"] = get_float_input("8. Microbial Load (log CFU) [0 to 10]: ", 0.0, 10.0)
    input_data["ethylene_ppm"] = get_float_input("9. Ethylene Level (ppm) [0 to 20]: ", 0.0, 20.0)

    return input_data

print("Models loaded successfully!\n")

while True:
    test_input = get_manual_input()
    
    print("\n" + "-" * 50)
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
    choice = input("\nPress ENTER to input another shipment, or type 'q' to quit: ")
    if choice.strip().lower() == 'q':
        print("Exiting...")
        break
