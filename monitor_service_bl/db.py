from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta

DB_PATH = "sqlite:///monitor.db"
Base = declarative_base()
engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine)

class CronResult(Base):
    __tablename__ = "cron_results"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    url = Column(String)
    status = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ContainerStatus(Base):
    __tablename__ = "container_status"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    status = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(engine)

# ---- Сохранение результатов крон-задач ----
def save_cron_result(name, url, status):
    session = Session()
    result = CronResult(name=name, url=url, status=str(status))
    session.add(result)
    session.commit()
    session.close()

# ---- Сохранение статусов контейнеров ----
def save_container_status(info):
    session = Session()
    result = ContainerStatus(name=info["name"], status=info["status"])
    session.add(result)
    session.commit()
    session.close()

# ---- Очистка старых записей ----
def cleanup_old_records(retention_days):
    cutoff = datetime.utcnow() - timedelta(days=retention_days)
    session = Session()
    session.query(CronResult).filter(CronResult.created_at < cutoff).delete()
    session.query(ContainerStatus).filter(ContainerStatus.created_at < cutoff).delete()
    session.commit()
    session.close()
