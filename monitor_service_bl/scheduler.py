import os
import time
import yaml
import schedule
import requests
import docker
import subprocess
from datetime import datetime
from croniter import croniter
from threading import Thread
from pytz import timezone as tz

from db import save_cron_result, save_container_status, cleanup_old_records

CONFIG_PATH = "config.yaml"

with open(CONFIG_PATH, "r") as f:
    config = yaml.safe_load(f)

CRON_JOBS = config.get("cron_jobs", [])
MONITORING_CONFIG = config.get("monitoring", {"retention_days": 14})


def get_docker_client():
    """
    Создаёт и возвращает Docker-клиент с настроенным подключением.
    
    ПРИНЦИП РАБОТЫ:
    1. Проверяет переменную окружения DOCKER_HOST
    2. Если не установлена, использует значение по умолчанию
    3. Создаёт Docker-клиент с указанным endpoint
    
    ВАРИАНТЫ DOCKER_HOST:
    - tcp://docker-socket-proxy:2375  → Через прокси (production-safe)
    - unix:///var/run/docker.sock    → Прямой доступ (только dev)
    
    ВОЗВРАЩАЕТ:
    - docker.DockerClient: Настроенный клиент для работы с Docker API
    
    ИСКЛЮЧЕНИЯ:
    - docker.errors.DockerException: Ошибка подключения к Docker
    - Exception: Любые другие ошибки при создании клиента
    
    ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:
        client = get_docker_client()
        containers = client.containers.list()
    
    ПРИМЕЧАНИЕ О БЕЗОПАСНОСТИ:
        При использовании tcp://docker-socket-proxy:2375 все запросы
        проходят через прокси-сервер, который фильтрует их по разрешённым
        API-методам. Это предотвращает выполнение опасных операций.
    """
    docker_host = os.getenv(
        "DOCKER_HOST", 
        "tcp://docker-socket-proxy:2375" 
    )
    print(f"[Docker Client] Подключение к Docker API: {docker_host}")
    
    try:
        client = docker.DockerClient(
            base_url=docker_host,  
            timeout=30 
        )
        
        return client
        
    except docker.errors.DockerException as e:
        print(f"[Docker Client] ❌ Ошибка Docker API: {e}")
        print(f"[Docker Client] Проверьте, что docker-socket-proxy запущен")
        raise
        
    except Exception as e:
        print(f"[Docker Client] ❌ Неизвестная ошибка: {e}")
        raise


def run_cron_job(job):
    """Выполняет HTTP или локальную задачу."""
    name = job.get("name", "Unnamed job")
    method = job.get("method", "GET").upper()
    script = job.get("script")
    url = job.get("url")
    api_key_env = job.get("api_key_env")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if method == "LOCAL":
        if not script or not os.path.exists(script):
            print(f"[{timestamp}]  {name}: Скрипт не найден ({script})")
            save_cron_result(name, script or "N/A", "not found")
            return

        print(f"[{timestamp}] Запуск локального скрипта: {script}")
        try:
            if script.endswith(".py"):
                subprocess.run(["python", script], check=True)
            elif script.endswith(".sh"):
                subprocess.run(["bash", script], check=True)
            else:
                subprocess.run(script, shell=True, check=True)

            print(f"[{timestamp}]  {name}: скрипт выполнен успешно")
            save_cron_result(name, script, "OK")
        except subprocess.CalledProcessError as e:
            print(f"[{timestamp}] ❌ Ошибка выполнения {name}: {e}")
            save_cron_result(name, script, f"error {e.returncode}")
        return

    if not url:
        print(f"[{timestamp}]  {name}: Пропущен — не указан URL")
        return

    headers = {}
    if api_key_env:
        api_key = os.getenv(api_key_env)
        if not api_key:
            print(f"[{timestamp}]  {name}: Переменная {api_key_env} не найдена")
        else:
            headers["x-scheduler-token"] = api_key

    try:
        if method == "POST":
            response = requests.post(url, headers=headers, timeout=15)
        else:
            response = requests.get(url, headers=headers, timeout=15)
        status = response.status_code
        print(f"[{timestamp}] 📡 {name} → {url} [{method}] → {status}")
    except Exception as e:
        status = str(e)
        print(f"[{timestamp}] ❌ Ошибка при выполнении {name}: {e}")

    save_cron_result(name, url, status)



# --------------------------------------------
# Утилиты для интервалов и cron выражений
# --------------------------------------------
def _parse_every(every_str):
    """Парсит строку every: '10 seconds', '5 minutes', '2 hours' и возвращает функцию schedule."""
    parts = every_str.strip().split()
    if len(parts) != 2:
        raise ValueError(f"Неверный формат every: {every_str}")
    num, unit = parts
    num = int(num)
    unit = unit.lower()

    if unit.startswith("second"):
        return lambda job: schedule.every(num).seconds.do(run_cron_job, job=job)
    elif unit.startswith("minute"):
        return lambda job: schedule.every(num).minutes.do(run_cron_job, job=job)
    elif unit.startswith("hour"):
        return lambda job: schedule.every(num).hours.do(run_cron_job, job=job)
    elif unit.startswith("day"):
        return lambda job: schedule.every(num).days.do(run_cron_job, job=job)
    else:
        raise ValueError(f"❌ Неподдерживаемая единица времени: {unit}")


def _schedule_cron_expression(job, cron_expr):
    """Создаёт поток, который выполняет задачу по cron-расписанию с учётом часового пояса."""
    job_tz = job.get("timezone", "UTC")
    tzinfo = tz(job_tz)

    def cron_runner():
        while True:
            base = datetime.now(tzinfo)
            iter = croniter(cron_expr, base)
            next_run = iter.get_next(datetime)
            sleep_time = (next_run - datetime.now(tzinfo)).total_seconds()
            print(f"🕒 [{job['name']}] next run at {next_run} ({job_tz})")
            time.sleep(max(sleep_time, 0))
            run_cron_job(job)

    Thread(target=cron_runner, daemon=True).start()


# --------------------------------------------
# Планирование задач
# --------------------------------------------
def schedule_cron_jobs():
    """Читает config.yaml и планирует все задачи."""
    for job in CRON_JOBS:
        if "interval_seconds" in job:
            seconds = int(job["interval_seconds"])
            schedule.every(seconds).seconds.do(run_cron_job, job=job)
            print(f" Scheduled '{job['name']}' every {seconds}s")

        elif "every" in job:
            try:
                setup = _parse_every(job["every"])
                setup(job)
                print(f" Scheduled '{job['name']}' every {job['every']}")
            except Exception as e:
                print(f"❌ Ошибка в every у '{job['name']}': {e}")

        elif "cron" in job:
            try:
                _schedule_cron_expression(job, job["cron"])
                print(f" Scheduled '{job['name']}' (cron: {job['cron']})")
            except Exception as e:
                print(f"❌ Ошибка cron у '{job['name']}': {e}")

        else:
            print(f" '{job['name']}' пропущен — нет interval_seconds / every / cron")

    print(" All jobs scheduled successfully.")


def monitor_containers(retention_days=14):
    """
    Мониторинг состояния контейнеров через Docker Socket Proxy.
    
    ПРИНЦИП РАБОТЫ:
    1. Создаём Docker-клиент через get_docker_client()
    2. Клиент подключается к docker-socket-proxy
    3. Прокси разрешает только безопасные операции
    4. Получаем список контейнеров (только чтение)
    5. Сохраняем статусы в базу данных
    
    БЕЗОПАСНОСТЬ:
    - Использует TCP-подключение к прокси (не прямой сокет)
    - Прокси фильтрует все запросы
    - Разрешены только GET-запросы к /containers/*
    - Нет возможности создавать/удалять контейнеры
    
    ВОЗМОЖНЫЕ ОШИБКИ:
    - docker.errors.DockerException: Прокси недоступен
    - ConnectionRefusedError: Прокзи не запущен
    - TimeoutError: Превышен таймаут подключения
    
    ПРИМЕЧАНИЕ:
    При использовании docker-socket-proxy с CONTAINERS: 1
    доступны только следующие операции:
    - GET /containers/json     → Список контейнеров
    - GET /containers/{id}/json → Информация о контейнере
    - GET /containers/{id}/logs→ Логи контейнера
    
    Запрещены:
    - POST /containers/create   → Создание контейнера
    - POST /containers/{id}/start → Запуск контейнера
    - POST /containers/{id}/stop → Остановка контейнера
    - DELETE /containers/{id}   → Удаление контейнера
    """
    try:
        client = get_docker_client()
        
        containers = client.containers.list(all=True)
        
        for container in containers:
            info = {"name": container.name, "status": container.status}
            save_container_status(info)
            print(f" {container.name}: {container.status}")
        
        cleanup_old_records(retention_days)
        
    except docker.errors.DockerException as e:
        print(f"❌ Ошибка Docker API: {e}")
        print("Проверьте, что docker-socket-proxy запущен")
        print("Проверьте значение переменной DOCKER_HOST")
        
    except ConnectionRefusedError as e:
        print(f"❌ Подключение отклонено: {e}")
        print("Проверьте, что docker-socket-proxy запущен")
        print("Проверьте сеть между контейнерами")
        
    except TimeoutError as e:
        print(f"❌ Таймаут подключения: {e}")
        print("Проверьте доступность docker-socket-proxy")
        print("Проверьте сетевые настройки")
        
    except Exception as e:
        print(f"❌ Ошибка мониторинга контейнеров: {e}")