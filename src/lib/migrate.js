/**
 * Database migrations — auto-run at startup
 */
const MIGRATIONS = [
  {
    version: '001_initial',
    sql: `
      -- Core tables from D1 schema
      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        link TEXT,
        price REAL DEFAULT 0,
        views INTEGER DEFAULT 0,
        author TEXT DEFAULT 'Expert',
        state TEXT DEFAULT 'открытая',
        param_count INTEGER DEFAULT 0,
        object_count INTEGER DEFAULT 0,
        tags TEXT,
        description TEXT,
        utility REAL DEFAULT 0,
        utility_price REAL DEFAULT 0,
        weights TEXT,
        updated_at TEXT DEFAULT (date('now')),
        created_at INTEGER DEFAULT (unixepoch()),
        owner_id INTEGER,
        org_id TEXT DEFAULT 'default'
      );

      CREATE TABLE IF NOT EXISTS columns (
        table_id TEXT NOT NULL PRIMARY KEY REFERENCES tables(id) ON DELETE CASCADE,
        definition TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        -- Materialized TCO/IRR/ROIC columns
        tco_1y REAL,
        tco_3y REAL,
        tco_5y REAL,
        irr_3y REAL,
        irr_5y REAL,
        roic_3y REAL,
        roic_5y REAL,
        currency TEXT DEFAULT 'RUB',
        tco_calculated_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_rows_table ON rows(table_id);

      CREATE TABLE IF NOT EXISTS table_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        author_id INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_versions_table ON table_versions(table_id);

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        google_id TEXT UNIQUE,
        name TEXT,
        role TEXT DEFAULT 'user',
        created_at INTEGER DEFAULT (unixepoch()),
        org_id TEXT DEFAULT 'default'
      );

      -- FTS5 full-text search (unicode61 for Russian)
      CREATE VIRTUAL TABLE IF NOT EXISTS tables_fts USING fts5(
        id, title, description, tags,
        content='tables',
        content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2'
      );

      -- EDP-specific tables
      CREATE TABLE IF NOT EXISTS council_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','interrupted')),
        alternatives TEXT,
        criteria TEXT,
        persona_results TEXT,
        final_decision TEXT,
        tokens_used INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0,
        provider TEXT,
        error TEXT,
        org_id TEXT DEFAULT 'default',
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS council_jobs_archive (
        id INTEGER PRIMARY KEY,
        topic TEXT NOT NULL,
        status TEXT,
        alternatives TEXT,
        criteria TEXT,
        persona_results TEXT,
        final_decision TEXT,
        tokens_used INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0,
        provider TEXT,
        error TEXT,
        org_id TEXT DEFAULT 'default',
        created_at TEXT,
        completed_at TEXT,
        archived_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS decision_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id TEXT,
        council_job_id INTEGER,
        decision TEXT,
        override_reason TEXT,
        reviewed_at TEXT,
        impact_actual TEXT,
        org_id TEXT DEFAULT 'default',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        data_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_table ON snapshots(table_id, version);

      CREATE TABLE IF NOT EXISTS dependencies (
        from_table_id INTEGER NOT NULL,
        to_table_id INTEGER NOT NULL,
        type TEXT DEFAULT 'blocks',
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (from_table_id, to_table_id)
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_hash TEXT NOT NULL UNIQUE,
        name TEXT,
        org_id TEXT DEFAULT 'default',
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS llm_cache (
        hash TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        response_hash TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        user_id TEXT,
        org_id TEXT DEFAULT 'default',
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT DEFAULT (datetime('now'))
      );

      -- Settings/config
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `
  },
  {
    version: '002_fts_triggers',
    sql: `
      -- FTS trigger: keep search index in sync
      CREATE TRIGGER IF NOT EXISTS tables_fts_insert AFTER INSERT ON tables BEGIN
        INSERT INTO tables_fts(rowid, id, title, description, tags)
        VALUES (new.rowid, new.id, new.title, new.description, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS tables_fts_update AFTER UPDATE ON tables BEGIN
        DELETE FROM tables_fts WHERE rowid = old.rowid;
        INSERT INTO tables_fts(rowid, id, title, description, tags)
        VALUES (new.rowid, new.id, new.title, new.description, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS tables_fts_delete AFTER DELETE ON tables BEGIN
        DELETE FROM tables_fts WHERE rowid = old.rowid;
      END;
    `
  },
  {
    version: '003_seed_exchange_rates',
    sql: `
      INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rates', '{"USD": 92.5, "EUR": 100.1, "date": "2026-04-30"}');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('wacc', '0.12');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_rate', '0.20');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('default_llm_provider', 'zai');
    `
  },
  {
    version: '005_council_personas',
    sql: `
      CREATE TABLE IF NOT EXISTS council_personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'advisor',
        enabled INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        model TEXT DEFAULT '',
        temperature REAL DEFAULT 0.3,
        system_prompt TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        emoji TEXT DEFAULT '\u{1F916}',
        updated_at TEXT
      );

      INSERT OR IGNORE INTO council_personas (id, name, role, enabled, sort_order, model, temperature, system_prompt, weight, emoji, updated_at) VALUES
        ('ceo', 'CEO', 'advisor', 1, 1, '', 0.3, 'Ты — CEO с 20-летним опытом управления. Оценивай с точки зрения бизнес-стратегии, ROI, рыночных рисков и конкурентных преимуществ. Давай конкретные рекомендации. Отвечай кратко, 3-5 предложений.', 1.2, '\u{1F454}', datetime('now')),
        ('cfo', 'CFO', 'advisor', 1, 2, '', 0.2, 'Ты — CFO, финансовый директор. Оценивай с точки зрения стоимости, TCO, hidden costs, финансовой устойчивости предложения. Важно: ROI, payback period, total cost of ownership. Отвечай кратко, 3-5 предложений.', 1.1, '\u{1F4B0}', datetime('now')),
        ('ciso', 'CISO', 'advisor', 1, 3, '', 0.3, 'Ты — CISO, директор по информационной безопасности. Оценивай риски: data privacy, vendor lock-in, compliance (GDPR, SOC2), инцидент-менеджмент. Отвечай кратко, 3-5 предложений.', 1.0, '\u{1F512}', datetime('now')),
        ('tech', 'Tech Lead', 'advisor', 1, 4, '', 0.4, 'Ты — Tech Lead, технический руководитель. Оценивай: архитектура, интеграции, API, масштабируемость, stack maturity, developer experience. Отвечай кратко, 3-5 предложений.', 1.0, '\u2699\uFE0F', datetime('now')),
        ('user_advocate', 'User Advocate', 'advisor', 1, 5, '', 0.5, 'Ты — Advocate конечного пользователя. Оценивай: UX, обучаемость, onboarding, поддержка пользователей, community, документация. Отвечай кратко, 3-5 предложений.', 0.9, '\u{1F464}', datetime('now')),
        ('critic', 'Критик', 'critic', 1, 6, '', 0.6, 'Ты — Критик-аналитик. Твоя задача — найти слабые места, подводные камни и риски в рекомендациях других экспертов. Играешь "адвоката дьявола". Указывай на то, что другие могли упустить. Отвечай кратко, 3-5 предложений.', 0.8, '\u{1F3AD}', datetime('now')),
        ('editor', 'Редактор', 'editor', 1, 7, '', 0.2, 'Ты — Редактор. На основе всех мнений экспертов, составь финальное резюме: 1) главная рекомендация, 2) ключевые аргументы за, 3) ключевые аргументы против, 4) итоговый вердикт. Формат: структурированный текст, не более 200 слов.', 0.5, '\u{1F4DD}', datetime('now'));
    `
  },
  {
    version: '006_decision_analytics',
    sql: `
      CREATE TABLE IF NOT EXISTS decision_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        table_id TEXT,
        table_title TEXT,
        ai_query TEXT,
        ai_objects TEXT,
        human_objects TEXT,
        match_count INTEGER DEFAULT 0,
        ai_count INTEGER DEFAULT 0,
        human_count INTEGER DEFAULT 0,
        match_percent REAL DEFAULT 0,
        original_leaders TEXT,
        simplified_leaders TEXT,
        original_top3 TEXT,
        simplified_top3 TEXT,
        top3_match_percent REAL DEFAULT 0,
        params_removed INTEGER DEFAULT 0,
        params_kept INTEGER DEFAULT 0,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `
  },
  {
    version: '004_visibility',
    sql: `
      ALTER TABLE tables ADD COLUMN visibility TEXT DEFAULT 'open';
    `
  },
  {
    version: '005_decision_tags',
    sql: `
      CREATE TABLE IF NOT EXISTS decision_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id INTEGER NOT NULL REFERENCES tables(id),
        tags TEXT NOT NULL DEFAULT '[]',
        note TEXT DEFAULT '',
        winner TEXT,
        score INTEGER,
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        decided_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(table_id)
      );
      CREATE INDEX IF NOT EXISTS idx_decision_tags_table ON decision_tags(table_id);
    `
  },
  {
    version: '006_decision_tags_alter',
    sql: `
      -- Columns already added in 005_decision_tags
    `
  },
  {
    version: '007_council_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS council_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER REFERENCES council_jobs(id),
        persona_name TEXT NOT NULL,
        persona_role TEXT,
        model TEXT,
        provider TEXT,
        system_prompt TEXT,
        user_prompt TEXT,
        ai_response TEXT,
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_council_logs_job ON council_logs(job_id);
    `
  }
]

export function migrate(db) {
  // Create schema_migrations if not exists
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`)

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map(r => r.version)
  )

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue

    db.transaction(() => {
      db.exec(migration.sql)
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(migration.version)
    })()

    console.log(`[migrate] Applied: ${migration.version}`)
  }

  // Archive old council_jobs
  archiveOldCouncilJobs(db)

  // Cleanup expired idempotency keys
  db.prepare("DELETE FROM idempotency_keys WHERE expires_at < datetime('now')").run()

  // Cleanup expired LLM cache
  db.prepare("DELETE FROM llm_cache WHERE expires_at < datetime('now')").run()
}

function archiveOldCouncilJobs(db) {
  const result = db.transaction(() => {
    const rows = db.prepare(
      "SELECT * FROM council_jobs WHERE status IN ('completed','failed') AND completed_at < datetime('now', '-90 days')"
    ).all()

    if (rows.length === 0) return 0

    const insert = db.prepare(`INSERT INTO council_jobs_archive
      (id, topic, status, alternatives, criteria, persona_results, final_decision,
       tokens_used, cost_usd, provider, error, org_id, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

    const del = db.prepare('DELETE FROM council_jobs WHERE id = ?')

    for (const row of rows) {
      insert.run(row.id, row.topic, row.status, row.alternatives, row.criteria,
        row.persona_results, row.final_decision, row.tokens_used, row.cost_usd,
        row.provider, row.error, row.org_id, row.created_at, row.completed_at)
      del.run(row.id)
    }

    return rows.length
  })()

  if (result > 0) {
    console.log(`[migrate] Archived ${result} old council jobs`)
  }
}
