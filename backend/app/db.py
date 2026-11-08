from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Adapt connection string for driver compatibility
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# If psycopg (psycopg 3) is not installed but psycopg2 is, route to postgresql+psycopg2://
try:
    import psycopg  # noqa: F401
except ImportError:
    try:
        import psycopg2  # noqa: F401
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    except ImportError:
        pass

engine_kwargs = {"pool_pre_ping": True}
if "postgresql" in db_url:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "connect_args": {"connect_timeout": 3}
    })

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
