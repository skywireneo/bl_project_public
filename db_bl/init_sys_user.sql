GRANT ALL PRIVILEGES ON DATABASE bl_main TO user_sys;
-- Предоставить права на все таблицы в схеме public
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO user_sys;
-- Предоставить права на все последовательности (sequences) в схеме public
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO user_sys;
-- Предоставить права на все функции в схеме public
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO user_sys;
GRANT ALL ON SCHEMA public TO user_sys;