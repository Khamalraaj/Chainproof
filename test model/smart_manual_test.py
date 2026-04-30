import pickle
import pandas as pd
import os
import warnings

warnings.filterwarnings('ignore')

DIR = r"S:\log iq\files (2)"

# ================================================================
#  REAL-WORLD SHELF LIFE LIMITS (food science sourced)
#  Max days a vegetable remains safe per storage condition
# ================================================================
REAL_SHELF_LIFE = {
    "beans":        {"ambient": 4,   "refrigerated": 7,   "cold_storage": 12,  "controlled_atmosphere": 14},
    "beetroot":     {"ambient": 5,   "refrigerated": 21,  "cold_storage": 90,  "controlled_atmosphere": 100},
    "bitter_gourd": {"ambient": 3,   "refrigerated": 7,   "cold_storage": 10,  "controlled_atmosphere": 12},
    "broccoli":     {"ambient": 2,   "refrigerated": 7,   "cold_storage": 14,  "controlled_atmosphere": 21},
    "cabbage":      {"ambient": 5,   "refrigerated": 21,  "cold_storage": 60,  "controlled_atmosphere": 90},
    "capsicum":     {"ambient": 4,   "refrigerated": 14,  "cold_storage": 21,  "controlled_atmosphere": 28},
    "carrot":       {"ambient": 5,   "refrigerated": 21,  "cold_storage": 60,  "controlled_atmosphere": 90},
    "cauliflower":  {"ambient": 3,   "refrigerated": 14,  "cold_storage": 21,  "controlled_atmosphere": 30},
    "cucumber":     {"ambient": 3,   "refrigerated": 10,  "cold_storage": 14,  "controlled_atmosphere": 21},
    "eggplant":     {"ambient": 3,   "refrigerated": 10,  "cold_storage": 14,  "controlled_atmosphere": 18},
    "okra":         {"ambient": 2,   "refrigerated": 7,   "cold_storage": 10,  "controlled_atmosphere": 12},
    "onion":        {"ambient": 60,  "refrigerated": 60,  "cold_storage": 120, "controlled_atmosphere": 150},
    "peas":         {"ambient": 2,   "refrigerated": 5,   "cold_storage": 14,  "controlled_atmosphere": 21},
    "potato":       {"ambient": 60,  "refrigerated": 90,  "cold_storage": 120, "controlled_atmosphere": 180},
    "radish":       {"ambient": 3,   "refrigerated": 14,  "cold_storage": 28,  "controlled_atmosphere": 35},
    "spinach":      {"ambient": 2,   "refrigerated": 6,   "cold_storage": 10,  "controlled_atmosphere": 14},
    "tomato":       {"ambient": 7,   "refrigerated": 14,  "cold_storage": 21,  "controlled_atmosphere": 28},
}

TEMP_HARD_CAPS = [
    (40, 1),
    (35, 2),
    (30, 4),
    (25, 7),
]

AMBIENT_TOLERANT = {"onion", "potato"}

# ================================================================
#  LOAD MODELS
# ================================================================
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
CONDITIONS = list(encoders['storage_condition'].classes_)
PACKAGING  = list(encoders['packaging_type'].classes_)

CATEGORICAL  = ['vegetable_type', 'storage_condition', 'packaging_type']
NUMERICAL    = ['storage_temp_c', 'temp_deviation_c', 'humidity_pct',
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
    ml_raw     = days

    veg       = input_dict["vegetable_type"]
    condition = input_dict["storage_condition"]
    temp      = input_dict["storage_temp_c"]
    damage    = input_dict["damage_score"]
    microbes  = input_dict["microbial_load_log_cfu"]

    overrides = []

    # Rule 1: Cap to real-world max for this vegetable + condition
    real_max = REAL_SHELF_LIFE.get(veg, {}).get(condition, 30)
    if days > real_max:
        days = real_max
        overrides.append("Shelf life capped to real-world max ({} days) for {} in {}.".format(real_max, veg, condition))

    # Rule 2: Temperature hard caps
    if veg not in AMBIENT_TOLERANT:
        for threshold, cap in TEMP_HARD_CAPS:
            if temp > threshold:
                if days > cap:
                    days = cap
                    overrides.append("Heat stress at {}C: shelf life capped to {} day(s).".format(temp, cap))
                if temp > 35:
                    spoilage = 1
                    overrides.append("SPOILED forced: temp {}C exceeds safe threshold (35C).".format(temp))
                break
    else:
        if temp > 40:
            days = min(days, 5)
            overrides.append("{} is ambient-tolerant but cannot survive >40C for long.".format(veg))

    # Rule 3: Critical microbial load
    if microbes >= 7.0:
        days = min(days, 2.0)
        spoilage = 1
        overrides.append("Critical microbial load ({} log CFU): max 2 days, forced SPOILED.".format(microbes))
    elif microbes >= 5.0:
        days = min(days, max(days * 0.4, 1.0))
        overrides.append("High microbial load ({} log CFU): shelf life reduced by 60%.".format(microbes))

    # Rule 4: Severe physical damage
    if damage >= 8.0:
        days = min(days, 1.5)
        spoilage = 1
        overrides.append("Severe damage (score {}): product near-spoiled, forced SPOILED.".format(damage))
    elif damage >= 5.0:
        days = round(days * 0.5, 1)
        overrides.append("Moderate damage (score {}): shelf life halved.".format(damage))

    days = round(max(days, 0.5), 1)
    spoilage_label = "Spoiled" if spoilage == 1 else "Fresh"

    return {
        "spoilage_status" : spoilage,
        "spoilage_label"  : spoilage_label,
        "days_good"       : days,
        "ml_raw_days"     : ml_raw,
        "confidence_pct"  : confidence,
        "overrides"       : overrides,
        "real_world_max"  : real_max,
    }

def get_smart_input():
    print("\n" + "="*60)
    print("  VEGETABLE SPOILAGE TESTER")
    print("  Press ENTER on any field to use the [default] value.")
    print("="*60)

    input_data = {}

    print("\nVegetables: " + ", ".join(VEGETABLES))
    while True:
        val = input("1. Vegetable Type [tomato]: ").strip().lower()
        if not val: val = "tomato"
        if val in VEGETABLES:
            input_data["vegetable_type"] = val
            break
        print("Invalid. Choose from: " + ", ".join(VEGETABLES))

    print("\nConditions: " + ", ".join(CONDITIONS))
    while True:
        val = input("2. Storage Condition [ambient]: ").strip().lower()
        if not val: val = "ambient"
        if val in CONDITIONS:
            input_data["storage_condition"] = val
            break
        print("Invalid. Choose from: " + ", ".join(CONDITIONS))

    print("\nPackaging: " + ", ".join(PACKAGING))
    while True:
        val = input("3. Packaging Type [loose]: ").strip().lower()
        if not val: val = "loose"
        if val in PACKAGING:
            input_data["packaging_type"] = val
            break
        print("Invalid. Choose from: " + ", ".join(PACKAGING))

    def get_float(prompt, default, min_val, max_val):
        while True:
            val_str = input("{} [{}]: ".format(prompt, default)).strip()
            if not val_str:
                return default
            try:
                val = float(val_str)
                if min_val <= val <= max_val:
                    return val
                print("Enter a value between {} and {}.".format(min_val, max_val))
            except ValueError:
                print("Enter a valid number.")

    print("\n-- Numerical Conditions --")
    input_data["storage_temp_c"]          = get_float("4. Storage Temp (C)",          25.0, -10.0, 50.0)
    input_data["temp_deviation_c"]        = get_float("5. Temp Deviation (C)",         2.0,   0.0, 20.0)
    input_data["humidity_pct"]            = get_float("6. Humidity (%)",              70.0,   0.0, 100.0)
    input_data["damage_score"]            = get_float("7. Physical Damage (0-10)",     1.0,   0.0, 10.0)
    input_data["microbial_load_log_cfu"]  = get_float("8. Microbial Load (0-10)",      2.0,   0.0, 10.0)
    input_data["ethylene_ppm"]            = get_float("9. Ethylene Level ppm (0-20)",  1.0,   0.0, 20.0)

    return input_data

print("Models loaded successfully!")

while True:
    test_input = get_smart_input()

    print("\n" + "-"*60)
    print("  HYBRID PREDICTION (ML + Domain Rules):")
    try:
        res = predict_vegetable_health(test_input)

        status_line = "  [FRESH]  " if res['spoilage_status'] == 0 else "  [SPOILED]"
        print(status_line + " " + res['spoilage_label'])
        print("  Shelf Life      : {} days remaining".format(res['days_good']))
        print("  Real-World Max  : {} days ({}, {})".format(
            res['real_world_max'], test_input['vegetable_type'], test_input['storage_condition']))
        print("  ML Raw Estimate : {} days  (before reality check)".format(res['ml_raw_days']))
        print("  ML Confidence   : {}%".format(res['confidence_pct']))

        if res['overrides']:
            print("\n  [!] OVERRIDES APPLIED:")
            for rule in res['overrides']:
                print("      -> " + rule)
        else:
            print("\n  [OK] ML prediction is within realistic bounds. No overrides needed.")

    except Exception as e:
        print("  Error: " + str(e))

    print("\n" + "="*60)
    choice = input("Press ENTER for another test, or type 'q' to quit: ")
    if choice.strip().lower() == 'q':
        print("Exiting...")
        break
