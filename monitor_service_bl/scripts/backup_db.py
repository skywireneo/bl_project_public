import os
import subprocess
from datetime import datetime
import glob
import yaml

backup_root = "/app/backups"
CONFIG_PATH = "config.yaml"

with open(CONFIG_PATH, "r") as f:
    config = yaml.safe_load(f)

main_dir = os.path.join(backup_root, "main")
os.makedirs(main_dir, exist_ok=True)

DB_NAME = os.getenv("DB_DB", "main_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")

LAST_BACKUPS_COUNT = config.get("monitoring", {}).get("backups_last_count", 4)
BACKUP_SQL = config.get("monitoring", {}).get("backup_sql", True)

os.environ["PGPASSWORD"] = DB_PASSWORD

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

if BACKUP_SQL:
    sql_plain_file = os.path.join(main_dir, f"{DB_NAME}_{timestamp}_plain.sql")
    print(f" Создаём SQL-дамп с чистыми SQL-командами: {sql_plain_file}")
    subprocess.run([
        "pg_dump", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
        "-F", "p", "-v", "--inserts", "-f", sql_plain_file, DB_NAME
    ], check=True, env=os.environ)

dump_file = os.path.join(main_dir, f"{DB_NAME}_{timestamp}.backup")
print(f" Создаём бинарный дамп основной БД: {dump_file}")

subprocess.run([
    "pg_dump", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
    "-F", "c", "-b", "-v", "-f", dump_file, DB_NAME
], check=True, env=os.environ)

print(" Бэкапы созданы успешно!")

def cleanup_old_backups(folder_path, keep=4):
    print(f" Запуск удаления старых бэкапов: {folder_path} / остаётся только {keep}")
    files = sorted(glob.glob(os.path.join(folder_path, f"{DB_NAME}_*.*")))
    if len(files) > keep * 2:  
        old_files = files[:-keep*2]
        for f in old_files:
            try:
                os.remove(f)
                print(f" Удалён старый бэкап: {os.path.basename(f)}")
            except Exception as e:
                print(f" Не удалось удалить {f}: {e}")

cleanup_old_backups(main_dir, keep=LAST_BACKUPS_COUNT)
