FROM postgres:17

# Копируем init-скрипты
COPY ./db_init /docker-entrypoint-initdb.d/

# Исправляем CRLF и даем права на выполнение
RUN sed -i 's/\r$//' /docker-entrypoint-initdb.d/*.sh \
    && chmod +x /docker-entrypoint-initdb.d/*.sh