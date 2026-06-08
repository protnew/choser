f = r'C:\Сделать\Чейчер SCRUM\openclaw\edp\src\api\councilStream.js'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

bad = "сравнения\\n';= 'Вопрос:"
good = "сравнения\\n';\n                const userMsg = 'Вопрос:"

c = c.replace(bad, good)
with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
print('OK')
