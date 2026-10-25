import os
import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("breathelens.database")

# ---------------------------------------------------------------------------
# Path resolution: anchored to this file's directory so the DB location is
# deterministic regardless of the working directory used to launch uvicorn.
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB = os.path.join(BASE_DIR, "aqi_db.sqlite")

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB}")

# Log the resolved database type (never log credentials)
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # Extract the file path from the URL for validation
    _db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    _db_dir = os.path.dirname(_db_path)
    if _db_dir and not os.path.exists(_db_dir):
        os.makedirs(_db_dir, exist_ok=True)
        logger.info(f"Created database directory: {_db_dir}")
    logger.info(f"Using SQLite database at: {_db_path}")

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30}
    )

    # Enable WAL mode and busy timeout on every connection for concurrent stability
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=10000")
        finally:
            cursor.close()
else:
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
    logger.info("Using PostgreSQL database (connection string redacted)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a scoped database session.

    - Rolls back on unhandled exceptions.
    - Always closes the session in the finally block.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        logger.exception("Database session rolled back due to unhandled exception")
        raise
    finally:
        db.close()


def db_health_check() -> dict:
    """Execute a lightweight read-only query to verify database connectivity.

    Returns a dict with 'status' ('healthy' | 'unhealthy') and 'detail'.
    Never exposes credentials or internal paths in the response.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "detail": "Database connection successful"}
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        return {"status": "unhealthy", "detail": "Database connection failed"}

