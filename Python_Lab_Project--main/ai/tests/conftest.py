import sys
import os

# Make sure all imports resolve from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Fake env vars so tests never need real secrets
os.environ.setdefault("GEMINI_API_KEY", "gemini-test-fake")
os.environ.setdefault("AI_INTERNAL_KEY", "test-secret-key")
os.environ.setdefault("CHROMA_PATH",     "/tmp/chroma_test")
os.environ.setdefault("ALLOWED_ORIGIN",  "http://localhost:3001")
