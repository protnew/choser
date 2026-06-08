import sys
f = r'C:\Сделать\Чейчер SCRUM\openclaw\edp\src\api\councilStream.js'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

idx = c.find('const systemPrompt = persona.system_prompt')
end_marker = "';\n                const userMsg"
end = c.find(end_marker, idx)
if end == -1:
    end_marker2 = ';\n                const userMsg'
    end = c.find(end_marker2, idx)
if end == -1:
    print("END NOT FOUND")
    sys.exit(1)

old = c[idx:end + len(end_marker)]
print(f"Replacing {len(old)} chars at {idx}")

new = """const systemPrompt = persona.system_prompt + '\\n\\n' + tableContext + '\\n\\nОБЯЗАТЕЛЬНО ответь ТОЛЬКО JSON-блоком:\\n```json\\n{"analysis": "Обоснование", "scores": {"A": {"p1": 8, "p2": 7}, "B": {"p1": 6, "p2": 9}}, "recommendation": "Лучший", "confidence": 8, "score": 82}\\n```\\n\\nПРАВИЛА:\\n- scores ОБЯЗАТЕЛЬНО - без него таблица не построится\\n- Оценки от 1 до 10 по каждому параметру для каждого объекта\\n- Если объекты не указаны в вопросе - предложи 3-5 лучших вариантов\\n- Если параметры не указаны - придумай 5-7 критериев сравнения\\n';"""

c = c[:idx] + new + c[end + len(end_marker):]
with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
print("OK")
