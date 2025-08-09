#!/usr/bin/env python3
import requests
import json

def test_translation():
    url = "http://127.0.0.1:8000/v1/chat/completions"
    
    payload = {
        "model": "deepl-ZH",
        "messages": [
            {
                "role": "system",
                "content": "You are a professional, authentic machine translation engine."
            },
            {
                "role": "user",
                "content": "Translate the following source text from English to Simplified Chinese. Output translation directly without any additional text.\n\nSource Text: hello world\n\nTranslated Text:"
            }
        ],
        "temperature": 0,
        "max_tokens": 256
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Translation successful!")
        else:
            print("❌ Translation failed!")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Is it running on port 8000?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_translation()
