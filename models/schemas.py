from pydantic import BaseModel
from typing import List, Dict, Any

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    stream: bool = False
    model: str