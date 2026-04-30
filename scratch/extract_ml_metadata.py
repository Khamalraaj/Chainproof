import pickle
import os
import json
import sys

DIR = r"/Users/aadipranav.s/Downloads/chainproof-backend/test model"

def log(msg):
    sys.stderr.write(msg + "\n")

try:
    log("Opening encoders.pkl...")
    with open(os.path.join(DIR, "encoders.pkl"), "rb") as f:
        encoders = pickle.load(f)
    
    log("Extracting classes...")
    metadata = {
        "vegetable_types": list(encoders['vegetable_type'].classes_),
        "storage_conditions": list(encoders['storage_condition'].classes_),
        "packaging_types": list(encoders['packaging_type'].classes_)
    }
    
    print(json.dumps(metadata))
    log("Done.")
except Exception as e:
    log(f"Error: {str(e)}")
    print(json.dumps({"error": str(e)}))
