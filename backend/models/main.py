from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import requests, shutil
from datetime import datetime
import model
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Question_text(BaseModel):
    question: str

class Answer(BaseModel):
    answer: str

DJANGO_URL = "http://10.10.91.219:8000/api/exec_sql_request/"

@app.post("/ask_text", response_model=Answer)
def ask_text(q: Question_text):
    print("Received question:", q.question)
    actions = model.generate_actions(q.question)
    print("Generated actions:", actions)
    response = requests.post(DJANGO_URL, json=actions)
    db_results = response.json()
    for action in actions["actions"]:
        if action.get("weather") and action["weather"] != False:
            weather_info = model.get_weather("Košice", datetime.fromisoformat(action["weather"]))
            db_results["weather"] = weather_info
    print("DB Results:", db_results)
    # db_results = {}
    answer = model.generate_answer(db_results, q.question)
    print("Generated answer:", answer)
    return Answer(answer=answer)

@app.post("/ask_audio")
def ask_audio(audio: UploadFile = File(...)):
    try:
        print(audio)
    except Exception as e:
        print("Error printing audio file info:", e)
    print("Received request for /ask_audio")
    print("audio =", audio)
    print("filename =", getattr(audio, "filename", None))
    print("content_type =", getattr(audio, "content_type", None))
    filepath = f"temp/{audio.filename}"
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    question = model.transcribe_audio(filepath)
    print("Transcribed question:", question)
    return ask_text(Question_text(question=question))
