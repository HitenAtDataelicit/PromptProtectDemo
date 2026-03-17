# PromptProtect: DLP ML Service

This service provides the machine learning API (`ml_service.py`) for the PromptProtect platform. It runs as a Flask server on port 7001 and exposes endpoints like `/evaluate` for checking potential passwords and API keys.

## Quick Start

```bash
pip install -r requirements.txt
python promptprotect/ml_service.py
```

## Data Flywheel (Continuous Improvement)

PromptProtect includes an integrated Data Flywheel to continuously improve the ML models for passwords and API keys based on your real traffic.

### The 3-Step Improvement Loop

1. **Auto-Collect**: As your application processes traffic, `ml_service.py` automatically evaluates potential passwords and API keys from the scanning engine. Any finding evaluated by the ML model is automatically saved to `datasets/raw/findings.jsonl`.
   
2. **Review Data**: 
   Launch the web-based reviewer dashboard:
   ```bash
   python start_reviewer.py
   ```
   Open `http://localhost:7002` in your browser. You will see all flagged queries along with their **Context Snippet** (the surrounding text). Select the rows and click:
   - **KEEP**: If it is a true password/secret (the model should block it).
   - **SUPPRESS**: If it is a false positive (the model should let it pass).
   
   *Your decisions are saved to `datasets/labeled/labeled.jsonl`.*

3. **Retrain Model**:
   Once you've labeled some data, retrain the `password_classifier.joblib` model instantly by running:
   ```bash
   python promptprotect/models/train.py
   ```
   The model is updated immediately. Restart `ml_service.py` to load the new intelligence.
