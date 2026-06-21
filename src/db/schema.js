import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const tables = sqliteTable('tables', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    link: text('link'),
    price: real('price').default(0.0),
    views: integer('views').default(0),
    author: text('author').default('Expert'),
    state: text('state').default('открытая'),
    paramCount: integer('param_count').default(0),
    objectCount: integer('object_count').default(0),
    tags: text('tags'),
    description: text('description'),
    utility: real('utility').default(0.0),
    utilityPrice: real('utility_price').default(0.0),
    weights: text('weights', { mode: 'json' }), // Stored as json string but type allows objects
    updatedAt: text('updated_at').default(''),
    createdAt: integer('created_at').default(0), // Replaces unixepoch
    ownerId: integer('owner_id'),
});

export const columns = sqliteTable('columns', {
    tableId: text('table_id')
        .notNull()
        .primaryKey()
        .references(() => tables.id, { onDelete: 'cascade' }),
    definition: text('definition', { mode: 'json' }).notNull(),
});

export const rows = sqliteTable(
    'rows',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        tableId: text('table_id')
            .notNull()
            .references(() => tables.id, { onDelete: 'cascade' }),
        data: text('data', { mode: 'json' }).notNull(),
    },
    (table) => ({
        tableIdx: index('idx_rows_table').on(table.tableId),
    })
);

export const tableVersions = sqliteTable(
    'table_versions',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        tableId: text('table_id')
            .notNull()
            .references(() => tables.id, { onDelete: 'cascade' }),
        data: text('data', { mode: 'json' }).notNull(),
        authorId: integer('author_id'),
        createdAt: integer('created_at').default(0),
    },
    (table) => ({
        tableIdx: index('idx_versions_table').on(table.tableId),
    })
);

export const councilPersonas = sqliteTable('council_personas', {
    id: text('id').primaryKey(),           // 'ceo', 'cfo', 'critic', etc.
    name: text('name').notNull(),           // 'CEO', 'CFO', 'Критик'
    role: text('role').notNull(),           // 'advisor', 'critic', 'editor', 'leader'
    enabled: integer('enabled').default(1),
    sortOrder: integer('sort_order').default(0),
    model: text('model').default(''),       // '' = use default chain
    temperature: real('temperature').default(0.3),
    systemPrompt: text('system_prompt').notNull(),
    weight: real('weight').default(1.0),    // voting weight
    emoji: text('emoji').default('🤖'),
    updatedAt: text('updated_at'),
});

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    googleId: text('google_id').unique(),
    name: text('name'),
    role: text('role').default('user'),
    createdAt: integer('created_at').default(0),
});
