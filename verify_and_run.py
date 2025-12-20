import subprocess
import time
import requests
import sys
import os

def run_demo():
    print("--- 1. Starting Backend Server ---")
    # Start the server as a subprocess
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.server:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd="agent_project",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    # Wait for server to be ready
    time.sleep(3)
    
    print("--- 2. Sending Code Review Request ---")
    print("Command: 'Please review the code in this directory.'\n")
    
    try:
        # Request the streaming endpoint
        # In Python requests, we can use stream=True to handle chunks
        url = "http://127.0.0.1:8000/stream?message=Please review the code"
        with requests.get(url, stream=True) as r:
            for chunk in r.iter_content(chunk_size=None):
                if chunk:
                    print(chunk.decode('utf-8'), end="", flush=True)
                    
    except Exception as e:
        print(f"\nError connecting to server: {e}")
    finally:
        print("\n\n--- 3. Cleaning up Server ---")
        server_process.terminate()

if __name__ == "__main__":
    # Ensure dependencies are available for this script
    try:
        import requests
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests
        
    run_demo()
