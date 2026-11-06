-- Включение pg_stat_statements для сбора статистики запросов
-- Параметры уже передаются в docker-compose.yml

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

GRANT SELECT ON pg_stat_statements TO PUBLIC;

