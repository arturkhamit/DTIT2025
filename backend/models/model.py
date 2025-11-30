from openai import OpenAI
from dotenv import load_dotenv
import os, json, openai, requests
from datetime import datetime

load_dotenv()
KEY = os.getenv("KEY")
OPENWHEATHER_KEY = os.getenv("OPENWEATHER_KEY")

if not KEY:
    raise RuntimeError("OPENAI_API_KEY is not in environment")
client = OpenAI(api_key=KEY)

def load_prompt(path):
    with open(path, "r", encoding='utf-8') as f:
        return f.read()
    
ACTIONS_PROMPT = load_prompt("prompts/to_actions.txt")
ANSWER_PROMPT = load_prompt("prompts/to_answer.txt")

def get_weather(city: str, date: datetime) -> dict:
    url = f"http://api.openweathermap.org/data/2.5/forecast?q={city}&appid={OPENWHEATHER_KEY}&units=metric"
    data = requests.get(url).json()
    target_timestamp = int(date.timestamp())
    closest = min(data['list'], key=lambda x: abs(x['dt'] - target_timestamp))
    return {
        "temp": closest["main"]["temp"],
        "weather": closest["weather"][0]["description"],
        "datetime": datetime.fromtimestamp(closest["dt"]).isoformat()
    }


def transcribe_audio(file_path: str) -> str:
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
    return transcript.text

def generate_actions(user_input: str) -> dict:
    response = client.responses.create(
    model="gpt-5.1",
    input=[
        {"role": "system", "content": ACTIONS_PROMPT},
        {"role": "user", "content": user_input}
    ],
    temperature=0,
    max_output_tokens=500
    )
    actions_dict = json.loads(response.output_text)
    return actions_dict

def generate_answer(result: dict, user_input: str) -> str:
    prompt = f"""{ANSWER_PROMPT}
    User Input: {user_input}
    Database Results:
    {json.dumps(result, indent=2)}
    """
    response = client.responses.create(
    model="gpt-5.1",
    input=[
        {"role": "system", "content": prompt},
        {"role": "user", "content": "Please generate a friendly response for the user."}
    ],
    temperature=0.3,
    max_output_tokens=500
    )
    return response.output_text

if __name__ == "__main__":
    while True:
        # question = transcribe_audio("input_ua.mp3")
        # print(question)
        question = input("Введіть ваше питання (або 'exit' для виходу): ")
        if question.lower() == 'exit':
            break
        actions = generate_actions(question)
        print(f"Згенеровані дії: {actions}")
        result = {}
        for action in actions["actions"]:
            if action.get("weather") and action["weather"] != False:
                weather_info = get_weather("Košice", datetime.fromisoformat(action["weather"]))
                result["weather"] = weather_info['weather']
        print(f"Отримані результати: {result}")
        answer = generate_answer(result, question)
        print(f"Answer: {answer}")
        # city = input("Enter city name for weather forecast (or 'exit' to quit): ")
        # if city.lower() == 'exit':
        #     break
        # weather_info = get_weather(city, datetime.now())
        # print(f"Weather Info: {weather_info}")