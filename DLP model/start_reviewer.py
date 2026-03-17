import os
import sys
from pathlib import Path

# Add the 'promptprotect' package to sys.path so the reviewer app can import it
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

if __name__ == "__main__":
    print("=" * 60)
    print("🔥 DLP DATA FLYWHEEL REVIEWER starting up...")
    print("=" * 60)
    print("1. Read prompts flagged by ml_service.py")
    print("2. Mark them as 'KEEP' (block) or 'SUPPRESS' (allow)")
    print("3. Run `python promptprotect/models/train.py` to upgrade the model")
    print("=" * 60)
    
    # Import and run the Flask app from reviewer
    from promptprotect.reviewer.app import app
    app.run(host="0.0.0.0", port=7002, debug=True)
