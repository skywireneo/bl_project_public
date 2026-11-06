import os
import time
import threading
from dotenv import load_dotenv
import schedule
import glob
import subprocess

from scheduler import schedule_cron_jobs, monitor_containers, CRON_JOBS
from db import Session, CronResult, ContainerStatus
from datetime import datetime

load_dotenv()

print("Monitor Service started...")

CRON_INTERVAL_SECONDS = int(os.getenv("MONITOR_SERVICE_CRON_INTERVAL_SECONDS", 60))
RETENTION_DAYS = int(os.getenv("MONITOR_SERVICE_RETENTION_DAYS", 14))

schedule_cron_jobs()

def console_interface():
    """Отдельный поток консоли, не мешающий основным задачам."""
    print("\nКонсоль запущена. Введите 'help' для списка команд.\n")
    while True:
        try:
            cmd = input("monitor> ").strip()
            if not cmd:
                continue

            if cmd == "help":
                print("""
Доступные команды:
  help            - показать список команд
  jobs            - показать список всех крон-задач
  run <номер>     - выполнить задачу немедленно
  stats           - показать статистику сервиса
  containers      - показать последние статусы контейнеров
  bad             - показать контейнеры с проблемными статусами
  backups         - управление бэкапами баз данных
  exit            - выйти из консоли (мониторинг продолжит работу)
""")

            elif cmd.startswith("backups"):
                subcmd = cmd.split(" ")[1:] if len(cmd.split()) > 1 else []
                handle_backup_command(subcmd)

            elif cmd == "jobs":
                print("\nСписок задач:")
                for i, job in enumerate(CRON_JOBS, start=1):
                    print(f"  {i}. {job['name']} → {job['url']}")
                print("")

            elif cmd.startswith("run "):
                try:
                    idx = int(cmd.split(" ")[1]) - 1
                    if 0 <= idx < len(CRON_JOBS):
                        from scheduler import run_cron_job
                        job = CRON_JOBS[idx]
                        print(f"▶Запуск задачи: {job['name']}")
                        threading.Thread(target=run_cron_job, args=(job,), daemon=True).start()
                    else:
                        print("❌ Неверный номер задачи.")
                except Exception as e:
                    print(f"Ошибка: {e}")

            elif cmd == "stats":
                session = Session()
                cron_count = session.query(CronResult).count()
                container_count = session.query(ContainerStatus).count()
                last_cron = session.query(CronResult).order_by(CronResult.created_at.desc()).first()
                last_container = session.query(ContainerStatus).order_by(ContainerStatus.created_at.desc()).first()
                print("\nСтатистика сервиса:")
                print(f"  Всего выполнено задач: {cron_count}")
                print(f"  Записей мониторинга контейнеров: {container_count}")
                if last_cron:
                    print(f"  Последняя крон-задача: {last_cron.name} ({last_cron.status}) [{last_cron.created_at}]")
                if last_container:
                    print(f"  Последний контейнер: {last_container.name} → {last_container.status} [{last_container.created_at}]")
                print("")
                session.close()

            elif cmd == "containers":
                session = Session()
                latest = (
                    session.query(ContainerStatus)
                    .order_by(ContainerStatus.created_at.desc())
                    .limit(10)
                    .all()
                )
                print("\n Последние статусы контейнеров:")
                for c in latest:
                    print(f"  {c.name:25} → {c.status:10} [{c.created_at}]")
                print("")
                session.close()

            elif cmd == "bad":
                bad_statuses = ("exited", "dead", "restarting", "paused")
                session = Session()
                latest_bad = (
                    session.query(ContainerStatus)
                    .filter(ContainerStatus.status.in_(bad_statuses))
                    .order_by(ContainerStatus.created_at.desc())
                    .limit(10)
                    .all()
                )
                if latest_bad:
                    print("\n❌ Проблемные контейнеры:")
                    for c in latest_bad:
                        print(f"  {c.name:25} → {c.status:10} [{c.created_at}]")
                else:
                    print(" Нет проблемных контейнеров.")
                print("")
                session.close()

            elif cmd == "exit":
                print("Консоль остановлена. Основная работа сервиса продолжается.\n")
                break

            else:
                print("❌ Неизвестная команда. Введите 'help' для справки.")

        except KeyboardInterrupt:
            print("\nКонсоль остановлена.")
            break
        except EOFError:
            break
        except Exception as e:
            print(f" Ошибка в консоли: {e}")


def handle_backup_command(args):
    """Меню управления бэкапами"""
    backup_root = "/app/backups"
    script_root = "/app"
    scripts_path = os.path.join(script_root, "scripts")

    main_dir = os.path.join(backup_root, "main")
    logs_dir = os.path.join(backup_root, "logs")

    os.makedirs(main_dir, exist_ok=True)
    os.makedirs(logs_dir, exist_ok=True)

    if not args:
        print("""
 Управление бэкапами:
  backups list            - показать список доступных бэкапов
  backups run main        - вручную создать бэкап основной БД
  backups run logs        - вручную создать бэкап логов
  backups clean           - удалить старые бэкапы (оставить последние 4)
""")
        return

    cmd = args[0]

    if cmd == "list":
        print("\nОсновная БД:")
        main_files = sorted(glob.glob(f"{main_dir}/*.backup"))
        if main_files:
            for f in main_files[-10:]:
                print(f"  {os.path.basename(f)}")
        else:
            print("  — нет бэкапов")

        print("\n🪵 БД логов:")
        log_files = sorted(glob.glob(f"{logs_dir}/*.backup"))
        if log_files:
            for f in log_files[-10:]:
                print(f"  {os.path.basename(f)}")
        else:
            print("  — нет бэкапов")
        print("")

    elif cmd == "run" and len(args) > 1:
        target = args[1]
        if target == "main":
            script = os.path.join(scripts_path, "backup_db.py")
        elif target == "logs":
            script = os.path.join(scripts_path, "backup_logs_db.py")
        else:
            print("❌ Неизвестная цель. Используйте: main или logs.")
            return

        if not os.path.exists(script):
            print(f" Скрипт не найден: {script}")
            return

        print(f"Запуск бэкапа для {target}...")
        threading.Thread(
            target=lambda: subprocess.run(["python3", script], check=False),
            daemon=True
        ).start()

    elif cmd == "clean":
        cleanup_old_backups(main_dir, keep=4)
        cleanup_old_backups(logs_dir, keep=4)
        print(" Очистка завершена.")

    else:
        print("❌ Неизвестная подкоманда. Введите 'backups' без аргументов для справки.")

def cleanup_old_backups(folder_path, keep=4):
    """Удаляет старые бэкапы, оставляя только последние N"""
    files = sorted(glob.glob(os.path.join(folder_path, "*.backup")))
    if len(files) > keep:
        old_files = files[:-keep]
        for f in old_files:
            try:
                os.remove(f)
                print(f"Удалён старый бэкап: {os.path.basename(f)}")
            except Exception as e:
                print(f" Не удалось удалить {f}: {e}")

console_thread = threading.Thread(target=console_interface, daemon=True)
console_thread.start()

while True:
    schedule.run_pending()
    time.sleep(1)
