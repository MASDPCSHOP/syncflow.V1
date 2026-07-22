CREATE TABLE IF NOT EXISTS user_data (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    products    JSONB NOT NULL DEFAULT '[]',
    sales       JSONB NOT NULL DEFAULT '[]',
    services    JSONB NOT NULL DEFAULT '[]',
    expenses    JSONB NOT NULL DEFAULT '[]',
    bookings    JSONB NOT NULL DEFAULT '[]',
    categories  JSONB NOT NULL DEFAULT '[]',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
