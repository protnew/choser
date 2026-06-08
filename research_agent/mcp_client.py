"""
Choser MCP Client — Python клиент для взаимодействия с Choser через MCP протокол.
Использует HTTP (JSON-RPC) вместо SSE для простоты.

Пример использования:
    client = ChoserMCPClient("https://choser-app.pages.dev")
    tables = client.search_tables("смартфоны")
    result = client.deep_research("Лучшие ноутбуки для программирования 2026")
"""

import requests
import json
import time
import os
from dotenv import load_dotenv

load_dotenv()


class ChoserMCPClient:
    def __init__(self, base_url=None):
        self.base_url = (base_url or os.getenv("CHOSER_API_URL", "https://choser-app.pages.dev")).rstrip("/")
        self.mcp_url = f"{self.base_url}/mcp/messages"
        self.session_id = "mcp-python-client"
        self._request_id = 0

    def _next_id(self):
        self._request_id += 1
        return self._request_id

    def _call(self, method, params=None):
        """Отправить JSON-RPC запрос к Choser MCP серверу"""
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
        }
        if params:
            payload["params"] = params

        response = requests.post(
            f"{self.mcp_url}?sessionId={self.session_id}",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=120  # AI-вызовы могут быть долгими
        )
        response.raise_for_status()
        data = response.json()

        if "error" in data:
            raise Exception(f"MCP Error {data['error'].get('code')}: {data['error'].get('message')}")

        return data.get("result")

    def _call_tool(self, tool_name, arguments):
        """Вызвать MCP-инструмент"""
        result = self._call("tools/call", {"name": tool_name, "arguments": arguments})
        if result and "content" in result:
            text = result["content"][0].get("text", "")
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return text
        return result

    # --- Публичные методы ---

    def initialize(self):
        """Инициализация MCP-сессии"""
        return self._call("initialize")

    def list_tools(self):
        """Получить список доступных инструментов"""
        result = self._call("tools/list")
        return result.get("tools", [])

    def search_tables(self, query):
        """Поиск таблиц по названию/описанию"""
        return self._call_tool("search_tables", {"query": query})

    def get_table_data(self, table_id, limit=10):
        """Получить данные таблицы"""
        return self._call_tool("get_table_data", {"table_id": table_id, "limit": limit})

    def get_table_formatted(self, table_id, fmt="markdown", limit=50):
        """Получить таблицу в формате Markdown или JSON"""
        return self._call_tool("get_table_formatted", {"table_id": table_id, "format": fmt, "limit": limit})

    def generate_table(self, prompt):
        """Сгенерировать новую таблицу через AI"""
        return self._call_tool("generate_table", {"prompt": prompt})

    def refine_table(self, table_id, instruction):
        """Улучшить существующую таблицу"""
        return self._call_tool("refine_table", {"table_id": table_id, "instruction": instruction})

    def deep_research(self, topic, depth=3, wait=True, poll_interval=5):
        """
        Запустить глубокое исследование.
        
        Args:
            topic: тема исследования
            depth: количество фаз (1-3)
            wait: ожидать завершения (polling)
            poll_interval: интервал polling в секундах
        
        Returns:
            Финальный результат исследования (JSON таблица Choser)
        """
        print(f"🚀 Запуск Deep Research: \"{topic}\" ({depth} фаз)")
        result = self._call_tool("deep_research", {"topic": topic, "depth": depth})

        if not wait:
            return result

        job_id = result.get("job_id")
        if not job_id:
            return result

        status = result.get("status")
        if status == "completed":
            print("✅ Исследование завершено за 1 шаг!")
            return result

        # Polling: ждём завершения
        while status not in ("completed", "failed"):
            print(f"⏳ Шаг выполняется... (статус: {status})")
            time.sleep(poll_interval)
            result = self._call_tool("research_status", {"job_id": job_id})
            status = result.get("status")
            steps = result.get("steps_completed", 0)
            total = result.get("total_steps", depth)
            print(f"   Прогресс: {steps}/{total}")

        if status == "completed":
            print("✅ Исследование завершено!")
            return result.get("result") or result
        else:
            print(f"❌ Исследование провалилось: {result.get('error')}")
            return result

    def sql_query(self, query):
        """Выполнить SELECT-запрос к базе"""
        return self._call_tool("sql_query_read_only", {"query": query})


if __name__ == "__main__":
    client = ChoserMCPClient()

    # 1. Инициализация
    info = client.initialize()
    print(f"🔗 Подключение к: {client.base_url}")
    print(f"   Сервер: {info.get('serverInfo', {}).get('name')}")

    # 2. Список инструментов
    tools = client.list_tools()
    print(f"\n📦 Доступные инструменты ({len(tools)}):")
    for t in tools:
        print(f"   • {t['name']}: {t.get('description', '')[:60]}")

    # 3. Интерактивный режим
    print("\n" + "="*50)
    topic = input("Введите тему исследования (или Enter для пропуска): ").strip()
    if topic:
        result = client.deep_research(topic, depth=3)
        filename = f"research_{topic.replace(' ', '_')[:30]}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"💾 Результат сохранён в {filename}")
