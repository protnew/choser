import os
import json
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# Загружаем переменные окружения (.env)
load_dotenv()

# Настройка Gemini API
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
CHOSER_API_URL = os.getenv("CHOSER_API_URL", "https://choser-app.pages.dev/api/tables")
CHOSER_TOKEN = os.getenv("CHOSER_TOKEN")

if not GEMINI_API_KEY:
    print("Ошибка: Не установлен GOOGLE_API_KEY в .env файле.")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)

def run_deep_research(query):
    print(f"🚀 Запуск глубокого исследования: {query}")
    
    # Режим "Deep Research" в API реализуется через модель с поисковым заземлением (Grounding)
    # Используем 2.0 Flash для скорости и качества поиска
    model = genai.GenerativeModel(
        model_name='gemini-2.0-flash',
        tools=[{'google_search': {}}]
    )

    prompt = f"""
    Проведи глубокое исследование по теме: "{query}".
    Шерсти интернет, изучи последние данные, сравни различные варианты.
    
    РЕЗУЛЬТАТ:
    Выдай результат СТРОГО в формате JSON. Это должен быть массив объектов, где каждый объект — это строка таблицы.
    Колонки должны быть осмысленными и описывать характеристики найденных объектов.
    
    ПРАВИЛА:
    1. Только чистый JSON. Без ```json или текста до/после.
    2. Минимум 7-10 строк данных.
    3. Значения должны быть реальными и проверенными.
    4. Постарайся включить колонки: 'Название', 'Описание', 'Цена/Стоимость', 'Плюсы', 'Минусы', 'Рейтинг'.
    """

    response = model.generate_content(prompt)
    
    try:
        # Убираем возможные маркеры markdown, если они просочились
        text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"❌ Ошибка парсинга JSON: {e}")
        print("Сырой ответ ИИ:", response.text)
        return None

def send_to_choser(data, title):
    if not CHOSER_TOKEN:
        print("⚠️ Токен CHOSER_TOKEN не задан. Результат сохранен локально.")
        return False

    payload = {
        "title": title,
        "data": data,
        "is_public": True
    }
    
    headers = {
        "Authorization": f"Bearer {CHOSER_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        res = requests.post(CHOSER_API_URL, json=payload, headers=headers)
        if res.status_code == 200 or res.status_code == 201:
            print(f"✅ Таблица '{title}' успешно создана в Choser!")
            return True
        else:
            print(f"❌ Ошибка API Choser: {res.status_code} {res.text}")
            return False
    except Exception as e:
        print(f"❌ Ошибка при отправке в Choser: {e}")
        return False

if __name__ == "__main__":
    topic = input("Введите тему исследования: ")
    result_json = run_deep_research(topic)
    
    if result_json:
        # Сохраняем локально
        filename = f"research_{topic.replace(' ', '_')}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(result_json, f, ensure_ascii=False, indent=2)
        print(f"💾 Результат сохранен в {filename}")
        
        # Пытаемся отправить в облако
        send_to_choser(result_json, topic)
