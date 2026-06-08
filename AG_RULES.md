# GLOBAL AGENT INSTRUCTIONS FOR THIS PROJECT

## 🚀 TERMINAL EXECUTION RULES (WINDOWS)

When executing terminal commands, you MUST use the following format to prevent freezing and ensure stability:

1.  **NEVER** use `wt.exe`, `powershell` or `pwsh` without flags.
2.  **ALWAYS** use the `powershell.exe` wrapper with the following flags.

### REQUIRED FORMAT:
`powershell.exe -NoProfile -NoLogo -Command "[YOUR_COMMAND]"`

### HANDLING QUOTES & PATHS (CRITICAL):
If your command contains paths with spaces or executes a program (like `python.exe`), you MUST use **single quotes** `'` inside the wrapper's double quotes.

**Examples:**

✅ **Correct (Simple):**
`powershell.exe -NoProfile -NoLogo -Command "npm run dev"`

✅ **Correct (Python/Node with Spaces):**
`powershell.exe -NoProfile -NoLogo -Command "& 'C:\Program Files\Python\python.exe' script.py"`

❌ **WRONG:**
`powershell.exe -NoProfile -NoLogo -Command "& \"C:\Program Files\Python\python.exe\" script.py"` (Syntax Error)

---

## ⛔ CANCELLED COMMAND RULE (CRITICAL)

If the user **cancels** a terminal command even once, the agent MUST:
1. **STOP** trying to re-execute the same command.
2. **Report** the command as plain text (e.g. "Запустите: `npm run build`") so the user can run it manually.
3. **NEVER** re-attempt the same command in a loop. One cancellation = permanent stop for that command.

---

## 🔒 SECURITY & MISTAKES

-   **Deployment:** Always use `powershell.exe -NoProfile -NoLogo -Command "npx wrangler deploy"`.
-   **Validation:** Before deployment, always run `node verify_frontend.js`.
