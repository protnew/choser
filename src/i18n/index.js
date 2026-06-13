/**
 * i18n — Internationalization for Choser EDP
 * English (default), Russian, Spanish, French
 * 
 * Usage: import { t } from '../i18n';  t('key')
 * Number formatting: import { fmtNum, fmtCurrency } from '../i18n';
 */

const translations = {
// ─── HEADER & NAV ───
  'app.title':           { en: 'Choser',         ru: 'Choser',         es: 'Choser',         fr: 'Choser' },
  'app.subtitle':        { en: 'Parametric Decision Tables', ru: 'Параметрические таблицы выбора', es: 'Tablas de decisión paramétricas', fr: 'Tableaux de décision paramétriques' },
  'nav.back':            { en: '← Back',          ru: '← Назад',        es: '← Atrás',        fr: '← Retour' },
  'nav.search':          { en: 'Search tables...', ru: 'Поиск в таблицах...', es: 'Buscar tablas...', fr: 'Rechercher des tableaux...' },
  'nav.newTable':        { en: '+ New',           ru: '+ Новая',        es: '+ Nueva',        fr: '+ Nouvelle' },
  'nav.newTableMenu':    { en: 'New table',       ru: 'Новая таблица',  es: 'Nueva tabla',    fr: 'Nouveau tableau' },
  'nav.importJson':      { en: '+ Import JSON',   ru: '+ Из JSON',      es: '+ Importar JSON', fr: '+ Importer JSON' },
  'nav.importJsonMenu':  { en: 'Import JSON',     ru: 'Импорт из JSON', es: 'Importar JSON',   fr: 'Importer JSON' },
  'nav.research':        { en: '🔍 Research',     ru: '🔍 Исследование', es: '🔍 Investigación', fr: '🔍 Recherche' },
  'nav.about':           { en: 'About',           ru: 'О проекте',      es: 'Acerca de',      fr: 'À propos' },
  'nav.council':         { en: '🏛️ Expert Council', ru: '🏛️ Совет экспертов', es: '🏛️ Consejo de expertos', fr: '🏛️ Conseil d\'experts' },
  'nav.admin':           { en: '⚙️ Admin',        ru: '⚙️ Админка',     es: '⚙️ Admin',       fr: '⚙️ Admin' },
  'nav.theme':           { en: 'Toggle theme',    ru: 'Тема',           es: 'Tema',           fr: 'Thème' },
  'nav.uiMode':          { en: 'UI style',        ru: 'Стиль',          es: 'Estilo UI',      fr: 'Style UI' },
  'nav.viewMode':        { en: 'Toggle view',     ru: 'Вид',            es: 'Vista',          fr: 'Vue' },

// ─── FOOTER ───
  'footer.copy':         { en: '© 2026 Choser',   ru: '© 2026 Choser',  es: '© 2026 Choser',  fr: '© 2026 Choser' },

// ─── COUNCIL SIDEBAR ───
  'council.topic':       { en: '🎯 Question',     ru: '🎯 Вопрос',      es: '🎯 Pregunta',    fr: '🎯 Question' },
  'council.topicPlaceholder': { en: 'What do you want to decide?', ru: 'Что нужно решить?', es: '¿Qué desea decidir?', fr: 'Que souhaitez-vous décider ?' },
  'council.testBtn':     { en: '🧪 Test: smartphones', ru: '🧪 Тест: смартфоны', es: '🧪 Test: smartphones', fr: '🧪 Test : smartphones' },
  'council.settings':    { en: '⚙️ Settings',     ru: '⚙️ Настройки',   es: '⚙️ Configuración', fr: '⚙️ Paramètres' },
  'council.mode':        { en: 'Execution:',      ru: 'Режим:',         es: 'Ejecución:',     fr: 'Exécution :' },
  'council.sequential':  { en: '🔄 Sequential',   ru: '🔄 По очереди',  es: '🔄 Secuencial',  fr: '🔄 Séquentiel' },
  'council.parallel':    { en: '⚡ Parallel',      ru: '⚡ Параллельно',  es: '⚡ Paralela',    fr: '⚡ Parallèle' },
  'council.source':      { en: '🔍 Data source:', ru: '🔍 Источник данных:', es: '🔍 Fuente de datos:', fr: '🔍 Source de données :' },
  'council.memory':      { en: '💾 Memory',       ru: '💾 Память',      es: '💾 Memoria',     fr: '💾 Mémoire' },
  'council.web':         { en: '🌐 Web',          ru: '🌐 Web',         es: '🌐 Web',         fr: '🌐 Web' },
  'council.webPlus':     { en: '🔎 Web+',         ru: '🔎 Web+',        es: '🔎 Web+',        fr: '🔎 Web+' },
  'council.limits':      { en: '💰 Limits:',      ru: '💰 Лимиты:',     es: '💰 Límites:',    fr: '💰 Limites :' },
  'council.tokens':      { en: 'tokens',          ru: 'токенов',        es: 'tokens',         fr: 'jetons' },
  'council.minutes':     { en: 'min',             ru: 'мин',            es: 'min',            fr: 'min' },
  'council.run':         { en: '🚀 Run Council',  ru: '🚀 Запустить совет', es: '🚀 Ejecutar consejo', fr: '🚀 Lancer le conseil' },
  'council.stop':        { en: '⏹ Stop',          ru: '⏹ Стоп',        es: '⏹ Parar',       fr: '⏹ Arrêter' },
  'council.agents':      { en: 'Agents',          ru: 'Агенты',         es: 'Agentes',        fr: 'Agents' },
  'council.enabled':     { en: 'enabled',         ru: 'вкл',            es: 'activado',       fr: 'activé' },
  'council.enableAll':   { en: 'All',             ru: 'Все',            es: 'Todos',          fr: 'Tous' },
  'council.disableAll':  { en: 'None',             ru: 'Все выкл',        es: 'Ninguno',         fr: 'Aucun' },
  'council.editAgent':   { en: 'Edit Agent',      ru: 'Редактировать',  es: 'Editar agente',  fr: 'Modifier l\'agent' },
  'council.agentName':   { en: 'Name',            ru: 'Имя',            es: 'Nombre',         fr: 'Nom' },
  'council.systemPrompt':{ en: 'System Prompt',   ru: 'Системный промпт', es: 'Prompt del sistema', fr: 'Prompt système' },
  'council.save':        { en: 'Save',            ru: 'Сохранить',      es: 'Guardar',        fr: 'Enregistrer' },
  'council.cancel':      { en: 'Cancel',          ru: 'Отмена',         es: 'Cancelar',       fr: 'Annuler' },
  'council.saving':      { en: 'Saving...',       ru: 'Сохраняю...',    es: 'Guardando...',   fr: 'Enregistrement...' },
  'council.weight':      { en: 'Weight',          ru: 'Вес',            es: 'Peso',           fr: 'Poids' },
  'council.numParams':   { en: 'Parameters',      ru: 'Параметры',      es: 'Parámetros',     fr: 'Paramètres' },
  'council.numObjects':  { en: 'Objects',         ru: 'Объекты',        es: 'Objetos',        fr: 'Objets' },
  'council.tableSelect': { en: 'From table',      ru: 'Из таблицы',     es: 'De tabla',       fr: 'De la table' },
  'council.none':        { en: '— none —',        ru: '— нет —',        es: '— ninguno —',    fr: '— aucun —' },
  'council.close':       { en: '✕',               ru: '✕',              es: '✕',              fr: '✕' },
  'council.selectTable': { en: 'Select table...',  ru: 'Выберите таблицу...', es: 'Seleccionar tabla...', fr: 'Sélectionner un tableau...' },
  'council.sidebarTitle': { en: '🏛️ Council',       ru: '🏛️ Совет',        es: '🏛️ Consejo',       fr: '🏛️ Conseil' },
  'council.parametersLabel': { en: 'Parameters:',  ru: 'Параметров:',     es: 'Parámetros:',     fr: 'Paramètres :' },
  'council.objectsLabel':  { en: 'Objects:',        ru: 'Объектов:',       es: 'Objetos:',        fr: 'Objets :' },
  'council.exampleTopic':  { en: 'e.g.: Best laptop', ru: 'Например: Лучший ноутбук', es: 'ej: El mejor portátil', fr: 'ex : Le meilleur portable' },
  'council.contextPlaceholder': { en: 'Context, budget, criteria...', ru: 'Контекст, бюджет, критерии...', es: 'Contexto, presupuesto, criterios...', fr: 'Contexte, budget, critères...' },
  'council.noTableSelected': { en: '— No table selected —', ru: '— Таблица не выбрана —', es: '— Ninguna tabla seleccionada —', fr: '— Aucun tableau sélectionné —' },
  'council.quickSearch':   { en: '🚀 Quick',        ru: '🚀 Быстрый',      es: '🚀 Rápido',       fr: '🚀 Rapide' },
  'council.deepSearch':    { en: '👑 Deep',         ru: '👑 Глубокий',     es: '👑 Profundo',     fr: '👑 Profond' },
  'council.tokensLabel':   { en: 'Tokens:',         ru: 'Токенов:',        es: 'Tokens:',         fr: 'Jetons :' },
  'council.timeLabel':     { en: 'Time:',           ru: 'Время:',          es: 'Tiempo:',         fr: 'Temps :' },
  'council.allYes':        { en: 'All ✓',           ru: 'Все ✓',           es: 'Todos ✓',         fr: 'Tous ✓' },
  'council.allNo':         { en: 'None ✗',          ru: 'Все ✗',           es: 'Ninguno ✗',       fr: 'Aucun ✗' },
  'council.loadingAgents': { en: '⏳ Loading...',    ru: '⏳ Загрузка...',   es: '⏳ Cargando...',   fr: '⏳ Chargement...' },
  'council.startBtn':      { en: '🚀 Start ({n})',  ru: '🚀 Начать ({n})', es: '🚀 Iniciar ({n})', fr: '🚀 Démarrer ({n})' },
'council.advisingAgents': { en: 'agents advising...', ru: 'агентов советуют...', es: 'agentes asesorando...', fr: 'agents conseillent...' },
  'council.editAgentTitle':{ en: '✏️ Edit Agent',    ru: '✏️ Редактирование агента', es: '✏️ Editar agente', fr: '✏️ Modifier l\'agent' },
  'council.agentNameLabel':{ en: 'Agent name',      ru: 'Имя агента',      es: 'Nombre del agente', fr: 'Nom de l\'agent' },
  'council.systemPromptLabel': { en: 'System Prompt', ru: 'Системный промпт', es: 'Prompt del sistema', fr: 'Prompt système' },
  'council.savingAgent':   { en: '⏳ Saving...',     ru: '⏳ Сохранение...',  es: '⏳ Guardando...',  fr: '⏳ Enregistrement...' },
  'council.saveAgent':     { en: '💾 Save',          ru: '💾 Сохранить',     es: '💾 Guardar',      fr: '💾 Enregistrer' },
  'council.cancelBtn':     { en: 'Cancel',          ru: 'Отмена',           es: 'Cancelar',        fr: 'Annuler' },
  'council.errorSaving':   { en: 'Error saving',    ru: 'Ошибка сохранения', es: 'Error al guardar', fr: 'Erreur de sauvegarde' },
  'council.testTopicSet':  { en: 'Which smartphone to choose?', ru: 'Какой смартфон выбрать?', es: '¿Qué smartphone elegir?', fr: 'Quel smartphone choisir ?' },
  'council.tooltip.sequential': { en: 'Agents think sequentially. Each subsequent agent sees the results of the previous one.', ru: 'Агенты думают последовательно. Каждый следующий видит результаты предыдущего.', es: 'Los agentes piensan secuencialmente. Cada agente ve los resultados del anterior.', fr: 'Les agents réfléchissent séquentiellement. Chaque agent voit les résultats du précédent.' },
  'council.tooltip.parallel': { en: 'All agents think simultaneously. Faster, but without mutual influence.', ru: 'Все агенты думают одновременно. Быстрее, но без взаимного влияния.', es: 'Todos los agentes piensan simultáneamente. Más rápido, pero sin influencia mutua.', fr: 'Tous les agents réfléchissent simultanément. Plus rapide, mais sans influence mutuelle.' },
  'council.tooltip.memory': { en: 'No web search. Agents use only their knowledge. Fast and free.', ru: 'Без поиска в интернете. Агенты используют только свои знания. Быстро, бесплатно.', es: 'Sin búsqueda web. Los agentes usan solo su conocimiento. Rápido y gratis.', fr: 'Pas de recherche web. Les agents utilisent uniquement leurs connaissances. Rapide et gratuit.' },
  'council.tooltip.single': { en: 'One search query. Agent gets fresh data in ~10 sec. Balance of speed and quality.', ru: 'Один поисковый запрос. Агент получает свежие данные за ~10 сек. Баланс скорости и качества.', es: 'Una consulta de búsqueda. El agente obtiene datos frescos en ~10 seg. Equilibrio de velocidad y calidad.', fr: 'Une requête de recherche. L\'agent obtient des données fraîches en ~10 sec. Équilibre vitesse et qualité.' },
  'council.tooltip.multi': { en: 'Each agent searches independently. Best coverage, but slower. Recommended for important decisions.', ru: 'Каждый агент ищет самостоятельно. Лучшее покрытие, но дольше. Рекомендуется для важных решений.', es: 'Cada agente busca de forma independiente. Mejor cobertura, pero más lento. Recomendado para decisiones importantes.', fr: 'Chaque agent cherche indépendamment. Meilleure couverture, mais plus lent. Recommandé pour les décisions importantes.' },
  'council.history':      { en: '📜 History', ru: '📜 История', es: '📜 Historial', fr: '📜 Historique' },
  'council.historyEmpty': { en: 'No sessions yet', ru: 'Пока нет сессий', es: 'Sin sesiones', fr: 'Aucune session' },
  'council.clearHistory': { en: '🗑️ Clear', ru: '🗑️ Очистить', es: '🗑️ Limpiar', fr: '🗑️ Effacer' },
  'council.ago':          { en: 'ago', ru: 'назад', es: 'atrás', fr: 'il y a' },
  'council.newChat':      { en: '➕ New chat', ru: '➕ Новый чат', es: '➕ Nuevo chat', fr: '➕ Nouveau chat' },
  'council.testFill':     { en: '🧪 Test data', ru: '🧪 Заполнить тест', es: '🧪 Datos de prueba', fr: '🧪 Données test' },
  'council.today':        { en: 'Today', ru: 'Сегодня', es: 'Hoy', fr: "Aujourd'hui" },
  'council.yesterday':    { en: 'Yesterday', ru: 'Вчера', es: 'Ayer', fr: 'Hier' },
  'council.previous7':    { en: 'Previous 7 days', ru: '7 дней', es: '7 días', fr: '7 jours' },
  'council.older':        { en: 'Older', ru: 'Ранее', es: 'Anterior', fr: 'Plus ancien' },

// ─── COUNCIL TABLE ───
  'table.tab':           { en: '📊 Table',        ru: '📊 Таблица',     es: '📊 Tabla',       fr: '📊 Tableau' },
  'table.verdict':       { en: '⚖️ Verdict',      ru: '⚖️ Вердикт',    es: '⚖️ Veredicto',  fr: '⚖️ Verdict' },
  'table.logs':          { en: '🔍 Logs',         ru: '🔍 Логи',        es: '🔍 Registros',  fr: '🔍 Journaux' },
  'table.all':           { en: '📋 All',          ru: '📋 Всё',         es: '📋 Todo',       fr: '📋 Tout' },
  'table.copyReport':    { en: '📋 Copy report',  ru: '📋 Копировать отчёт', es: '📋 Copiar informe', fr: '📋 Copier le rapport' },
  'table.copied':        { en: '✅ Copied!',      ru: '✅ Скопировано!', es: '✅ ¡Copiado!',  fr: '✅ Copié !' },
  'table.save':          { en: '💾 Save',         ru: '💾 Сохранить',   es: '💾 Guardar',    fr: '💾 Enregistrer' },
  'table.saving':        { en: '⏳ Saving...',    ru: '⏳ Сохраняю...',  es: '⏳ Guardando...', fr: '⏳ Enregistrement...' },
  'table.share':         { en: '🔗 Share',        ru: '🔗 Поделиться',  es: '🔗 Compartir',  fr: '🔗 Partager' },
  'table.shared':        { en: '📋 Copied!',      ru: '📋 Скопировано!', es: '📋 ¡Copiado!',  fr: '📋 Copié !' },
  'table.noData':        { en: 'Ask the Council of Experts to get a recommendation', ru: 'Задайте вопрос Совету экспертов для получения рекомендации', es: 'Pregunte al Consejo de expertos para obtener una recomendación', fr: 'Posez votre question au Conseil d\'experts pour obtenir une recommandation' },
  'table.consensus':     { en: 'Consensus',       ru: 'Консенсус',      es: 'Consenso',       fr: 'Consensus' },
  'table.score':         { en: 'Score',           ru: 'Балл',           es: 'Puntuación',     fr: 'Score' },
  'table.recommendation':{ en: 'Recommendation',  ru: 'Рекомендация',   es: 'Recomendación',  fr: 'Recommandation' },
  'table.votes':         { en: 'votes',           ru: 'голосов',        es: 'votos',          fr: 'votes' },
  'table.cells':         { en: 'cells empty',     ru: 'ячеек пусто',    es: 'celdas vacías',  fr: 'cellules vides' },
  'table.fillRate':      { en: 'fill rate',       ru: 'заполнено',      es: 'tasa de llenado', fr: 'taux de remplissage' },
  'table.weights':       { en: 'Weights',         ru: 'Веса',           es: 'Pesos',          fr: 'Poids' },
  'table.weightedAvg':   { en: 'Weighted avg',    ru: 'Средневзвеш.',   es: 'Media ponderada', fr: 'Moyenne pond.' },
  'table.noLogs':        { en: 'No logs yet',     ru: 'Логов ещё нет',  es: 'Sin registros aún', fr: 'Pas encore de journaux' },
  'table.saved':         { en: '✅ Saved',         ru: '✅ Сохранено',   es: '✅ Guardado',     fr: '✅ Enregistré' },
  'table.clear':         { en: '🗑 Clear',         ru: '🗑 Очистить',    es: '🗑 Limpiar',      fr: '🗑 Effacer' },
  'table.noNumericData': { en: 'Agents did not provide numeric ratings', ru: 'Агенты не дали числовых оценок', es: 'Los agentes no dieron calificaciones numéricas', fr: 'Les agents n\'ont pas fourni de notes numériques' },
  'table.editorSummary': { en: '📝 Editor Summary', ru: '📝 Резюме Редактора', es: '📝 Resumen del editor', fr: '📝 Résumé de l\'éditeur' },
  'table.generalRecommendation': { en: '👑 General Recommendation', ru: '👑 Общая рекомендация', es: '👑 Recomendación general', fr: '👑 Recommandation générale' },
  'table.agentVoting':   { en: '📊 Agent Voting',  ru: '📊 Голосование агентов', es: '📊 Votación de agentes', fr: '📊 Vote des agents' },
  'table.eachAgentVote': { en: '🗳️ Individual Agent Votes', ru: '🗳️ Голоса каждого агента', es: '🗳️ Votos de cada agente', fr: '🗳️ Votes de chaque agent' },
  'table.sources':       { en: '📎 Sources:',      ru: '📎 Источники:',   es: '📎 Fuentes:',      fr: '📎 Sources :' },
  'table.closeBtn':      { en: 'Close',            ru: 'Закрыть',        es: 'Cerrar',          fr: 'Fermer' },
  'table.saveBtn':       { en: '💾 Save',          ru: '💾 Сохранить',   es: '💾 Guardar',      fr: '💾 Enregistrer' },
  'table.hours24':       { en: '⏱ 24 h',           ru: '⏱ 24 ч',        es: '⏱ 24 h',          fr: '⏱ 24 h' },
  'council.aiAgents':    { en: 'AI Agent Council', ru: 'Совет AI-агентов', es: 'Consejo de agentes IA', fr: 'Conseil d\'agents IA' },
  'council.describeLeft':{ en: 'Describe what you want to choose on the left', ru: 'Опишите что хотите выбрать слева', es: 'Describa lo que desea elegir a la izquierda', fr: 'Décrivez ce que vous voulez choisir à gauche' },
  'council.orTestFill':  { en: 'Or press "🧪 Fill test"', ru: 'Или нажмите «🧪 Заполнить тест»', es: 'O pulse "🧪 Llenar prueba"', fr: 'Ou appuyez sur "🧪 Remplir test"' },
  'council.askQuestionAbout': { en: 'Question about', ru: 'Вопрос по', es: 'Pregunta sobre', fr: 'Question sur' },
  'council.describeTaskLeft': { en: 'Describe the task on the left...', ru: 'Опишите задачу слева...', es: 'Describa la tarea a la izquierda...', fr: 'Décrivez la tâche à gauche...' },
  'council.rename':       { en: '✏️ Rename', ru: '✏️ Переименовать', es: '✏️ Renombrar', fr: '✏️ Renommer' },
  'council.delete':       { en: '🗑️ Delete', ru: '🗑️ Удалить', es: '🗑️ Eliminar', fr: '🗑️ Supprimer' },
  'council.moveTo':       { en: '📁 Move to...', ru: '📁 Переместить в...', es: '📁 Mover a...', fr: '📁 Déplacer vers...' },
  'council.deletedFolder':{ en: '🗑️ Deleted', ru: '🗑️ Удалённые', es: '🗑️ Eliminados', fr: '🗑️ Supprimés' },
  'council.restore':      { en: '♻️ Restore', ru: '♻️ Восстановить', es: '♻️ Restaurar', fr: '♻️ Restaurer' },
  'council.permanentDelete': { en: '❌ Delete forever', ru: '❌ Удалить навсегда', es: '❌ Eliminar para siempre', fr: '❌ Supprimer définitivement' },
  'council.emptyTrash':   { en: '🧹 Empty trash', ru: '🧹 Очистить корзину', es: '🧹 Vaciar papelera', fr: '🧹 Vider la corbeille' },
  'council.stopCouncil':  { en: '⏹ Stop', ru: '⏹ Стоп', es: '⏹ Parar', fr: '⏹ Arrêter' },
  'council.inputPlaceholder': { en: 'Clarify your request or ask a question about the table...', ru: 'Уточните запрос или задайте вопрос о таблице...', es: 'Clarifique su solicitud o pregunte sobre la tabla...', fr: 'Précisez votre demande ou posez une question sur le tableau...' },

// ─── COUNCIL PROGRESS ───
  'progress.thinking':   { en: 'is thinking...',  ru: 'думает...',      es: 'está pensando...', fr: 'réfléchit...' },
  'progress.waiting':    { en: 'Waiting for agents...', ru: 'Ожидание агентов...', es: 'Esperando agentes...', fr: 'En attente des agents...' },
  'progress.done':       { en: 'Done!',           ru: 'Готово!',        es: '¡Hecho!',        fr: 'Terminé !' },
  'progress.elapsed':    { en: 'elapsed',         ru: 'прошло',         es: 'transcurrido',   fr: 'écoulé' },
  'progress.statusDone': { en: '✅ Done',          ru: '✅ Готово',      es: '✅ Hecho',       fr: '✅ Terminé' },
  'progress.statusThinking': { en: '🧠 Thinking',  ru: '🧠 Думает',      es: '🧠 Pensando',    fr: '🧠 Réflexion' },
  'progress.statusWaiting': { en: '⏳ Waiting',     ru: '⏳ Ожидает',     es: '⏳ Esperando',   fr: '⏳ En attente' },
  'progress.agentsDone': { en: 'agents',           ru: 'агентов',        es: 'agentes',        fr: 'agents' },
  'progress.tokensSpent':{ en: 'tokens',           ru: 'токенов',        es: 'tokens',         fr: 'jetons' },
  'progress.thinkingAgent': { en: 'is thinking...', ru: 'думает...',      es: 'está pensando...', fr: 'réfléchit...' },

// ─── HEADER / APP ───
  'app.openList':        { en: 'Open List',        ru: 'Открытый список', es: 'Lista abierta', fr: 'Liste ouverte' },
  'app.loadingModule':   { en: 'Loading module...', ru: 'Загрузка модуля...', es: 'Cargando módulo...', fr: 'Chargement du module...' },
  'app.unexpectedError': { en: 'Unexpected error',  ru: 'Непредвиденная ошибка', es: 'Error inesperado', fr: 'Erreur inattendue' },
  'app.stableVersion':   { en: 'Stable version',    ru: 'Стабильная версия', es: 'Versión estable', fr: 'Version stable' },

// ─── GRID / HOME ───
  'grid.newCol':         { en: 'New column name:', ru: 'Название новой колонки:', es: 'Nombre de nueva columna:', fr: 'Nom de la nouvelle colonne :' },
  'grid.confirmDelete':  { en: 'Delete?',         ru: 'Удалить?',       es: '¿Eliminar?',     fr: 'Supprimer ?' },
  'grid.deleteRow':      { en: '🗑️ Delete row',   ru: '🗑️ Удалить строку', es: '🗑️ Eliminar fila', fr: '🗑️ Supprimer la ligne' },
  'grid.open':           { en: '📂 Open',          ru: '📂 Открыть',     es: '📂 Abrir',       fr: '📂 Ouvrir' },
  'grid.deleteTable':    { en: '🗑️ Delete',       ru: '🗑️ Удалить',     es: '🗑️ Eliminar',    fr: '🗑️ Supprimer' },
  'grid.avgRow':         { en: 'Average',         ru: 'Среднее',        es: 'Promedio',       fr: 'Moyenne' },
  'grid.noName':         { en: 'Untitled',        ru: 'Без названия',   es: 'Sin título',     fr: 'Sans titre' },
  'grid.aiSearch':       { en: 'AI Search',       ru: 'ИИ-поиск',       es: 'Búsqueda IA',    fr: 'Recherche IA' },

// ─── ADMIN ───
  'admin.settings':      { en: '1 ⚙️ AI Settings', ru: '1 ⚙️ Настройки AI', es: '1 ⚙️ Configuración IA', fr: '1 ⚙️ Configuration IA' },
  'admin.users':         { en: '2 👥 Users',      ru: '2 👥 Пользователи', es: '2 👥 Usuarios', fr: '2 👥 Utilisateurs' },
  'admin.trash':         { en: '3 🗑️ Trash',      ru: '3 🗑️ Корзина',   es: '3 🗑️ Papelera', fr: '3 🗑️ Corbeille' },
  'admin.backup':        { en: '4 💾 Backup',     ru: '4 💾 Бэкап',     es: '4 💾 Respaldo', fr: '4 💾 Sauvegarde' },
  'admin.analytics':     { en: '5 📊 Analytics',  ru: '5 📊 Аналитика', es: '5 📊 Analítica', fr: '5 📊 Analytique' },
  'admin.sensitivity':   { en: '6 📉 Sensitivity', ru: '6 📉 Чувствительность', es: '6 📉 Sensibilidad', fr: '6 📉 Sensibilité' },
  'admin.sensitivityExt':{ en: '7 🔬 Sensitivity+', ru: '7 🔬 Чувствительность+', es: '7 🔬 Sensibilidad+', fr: '7 🔬 Sensibilité+' },
  'admin.ebm':           { en: '8 📈 EBM Models',  ru: '8 📈 Модели EBM', es: '8 📈 Modelos EBM', fr: '8 📈 Modèles EBM' },
  'admin.restore':       { en: '♻️ Restore',      ru: '♻️ Восстановить', es: '♻️ Restaurar',  fr: '♻️ Restaurer' },
  'admin.downloadBackup':{ en: '📥 Download backup', ru: '📥 Скачать бэкап', es: '📥 Descargar respaldo', fr: '📥 Télécharger la sauvegarde' },

// ─── AUTH ───
  'auth.login':          { en: 'Login',           ru: 'Войти',          es: 'Iniciar sesión', fr: 'Connexion' },
  'auth.register':       { en: 'Register',        ru: 'Регистрация',    es: 'Registro',      fr: 'Inscription' },
  'auth.logout':         { en: 'Logout',          ru: 'Выйти',          es: 'Cerrar sesión', fr: 'Déconnexion' },
  'auth.name':           { en: 'Name',            ru: 'Имя',            es: 'Nombre',         fr: 'Nom' },
  'auth.email':          { en: 'Email',           ru: 'Email',          es: 'Correo',         fr: 'E-mail' },
  'auth.password':       { en: 'Password',        ru: 'Пароль',         es: 'Contraseña',     fr: 'Mot de passe' },
  'auth.role':           { en: 'Role',            ru: 'Роль',           es: 'Rol',            fr: 'Rôle' },

// ─── WARNINGS / RECOMMENDATIONS ───
  'warning.incomplete':  { en: 'cells not filled', ru: 'ячеек не заполнено', es: 'celdas sin rellenar', fr: 'cellules non remplies' },
  'rec.addObjects':      { en: 'Consider adding more objects for better analysis', ru: 'Добавьте больше объектов для лучшего анализа', es: 'Considere agregar más objetos para un mejor análisis', fr: 'Envisagez d\'ajouter plus d\'objets pour une meilleure analyse' },
  'rec.addParams':       { en: 'Consider adding more parameters', ru: 'Добавьте больше параметров', es: 'Considere agregar más parámetros', fr: 'Envisagez d\'ajouter plus de paramètres' },
  'rec.idealObjects':    { en: 'Ideal: {n} objects', ru: 'Идеально: {n} объектов', es: 'Ideal: {n} objetos', fr: 'Idéal : {n} objets' },
  'rec.idealParams':     { en: 'Ideal: {n} parameters', ru: 'Идеально: {n} параметров', es: 'Ideal: {n} parámetros', fr: 'Idéal : {n} paramètres' },

// ─── MODALS ───
  'modal.createTable':   { en: 'Create Table',    ru: 'Создать таблицу', es: 'Crear tabla',    fr: 'Créer un tableau' },
  'modal.tableName':     { en: 'Table name',      ru: 'Название',       es: 'Nombre de tabla', fr: 'Nom du tableau' },
  'modal.description':   { en: 'Description',     ru: 'Описание',       es: 'Descripción',    fr: 'Description' },
  'modal.import':        { en: 'Import from JSON', ru: 'Импорт из JSON', es: 'Importar desde JSON', fr: 'Importer depuis JSON' },

// ─── ERROR BOUNDARY ───
  'error.title':         { en: 'Something went wrong', ru: 'Что-то пошло не так', es: 'Algo salió mal', fr: 'Quelque chose s\'est mal passé' },
  'error.reload':        { en: '🔄 Reload',       ru: '🔄 Перезагрузить', es: '🔄 Recargar',    fr: '🔄 Recharger' },

// ─── MISC ───
  'misc.loading':        { en: 'Loading...',      ru: 'Загрузка...',    es: 'Cargando...',    fr: 'Chargement...' },
  'misc.saved':          { en: 'Saved',           ru: 'Сохранено',      es: 'Guardado',       fr: 'Enregistré' },
  'misc.yes':            { en: 'Yes',             ru: 'Да',             es: 'Sí',             fr: 'Oui' },
  'misc.no':             { en: 'No',              ru: 'Нет',            es: 'No',             fr: 'Non' },
  'misc.or':             { en: 'or',              ru: 'или',            es: 'o',              fr: 'ou' },
  'misc.total':          { en: 'Total:',          ru: 'Всего:',         es: 'Total:',         fr: 'Total :' },
  'misc.found':          { en: 'Found',           ru: 'Найдено',        es: 'Encontrado',     fr: 'Trouvé' },
};

// ─── EXPORTS ───

/** Current locale — default 'en', stored in localStorage */
let _locale = typeof localStorage !== 'undefined' 
  ? (localStorage.getItem('choser_lang') || 'en') 
  : 'en';

export function getLocale() { return _locale; }

export function setLocale(lang) {
  _locale = lang;
  if (typeof localStorage !== 'undefined') localStorage.setItem('choser_lang', lang);
}

/**
 * Translate key to current locale.
 * Supports interpolation: t('rec.idealObjects', { n: 5 }) → "Ideal: 5 objects"
 */
export function t(key, params) {
  const entry = translations[key];
  if (!entry) return key; // fallback: return key itself
  let text = entry[_locale] || entry['en'] || key;
  if (params) {
    Object.keys(params).forEach(k => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    });
  }
  return text;
}

/** Format number with locale-specific separators */
export function fmtNum(n, decimals = 0) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  const locales = { en: 'en-US', ru: 'ru-RU', es: 'es-ES', fr: 'fr-FR' };
  return n.toLocaleString(locales[_locale] || 'en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

/** Format currency with locale */
export function fmtCurrency(amount, currency = 'USD') {
  if (typeof amount !== 'number' || isNaN(amount)) return '—';
  const locales = { en: 'en-US', ru: 'ru-RU', es: 'es-ES', fr: 'fr-FR' };
  return amount.toLocaleString(locales[_locale] || 'en-US', { 
    style: 'currency', 
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Format percentage */
export function fmtPercent(value, decimals = 0) {
  if (typeof value !== 'number' || isNaN(value)) return '—';
  return value.toFixed(decimals) + '%';
}

/** Format duration in seconds */
export function fmtDuration(ms) {
  if (!ms) return '—';
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + 's';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}

/** Available languages (Top 10) */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ar', label: 'العربية' }
];
