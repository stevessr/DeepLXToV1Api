import os

TRANSLATION_API_KEY = os.environ.get("TRANSLATION_API_KEY", "")
TRANSLATION_API_URL = os.environ.get("TRANSLATION_API_URL", f"https://api.deeplx.org/{TRANSLATION_API_KEY}/translate")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))