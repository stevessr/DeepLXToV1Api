import logging
import uvicorn
from fastapi import FastAPI
from api.routes import router as api_router
from config import settings

logging.basicConfig(level=logging.INFO)

app = FastAPI()

app.include_router(api_router)

if __name__ == '__main__':
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
