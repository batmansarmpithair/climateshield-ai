import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure current directory is in sys.path
    cur_dir = os.path.dirname(os.path.abspath(__file__))
    if cur_dir not in sys.path:
        sys.path.insert(0, cur_dir)

    port = int(os.environ.get("PORT", 8000))
    print(f"Starting ClimateShield AI FastAPI Backend on http://127.0.0.1:{port} ...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False)
