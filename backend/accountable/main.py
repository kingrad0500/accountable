"""The FastAPI app: mounts each area's router under /api and prepares the database."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import activities, config, contacts, dashboard, db, deals, organizations


def prepare_database() -> None:
    """Create the database, and fill it with sample data when it's new (G2)."""
    is_new = not config.db_path().exists()
    db.create_schema()
    if is_new:
        from .seed import seed

        with db.get_engine().begin() as conn:
            seed(conn)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    prepare_database()
    yield
    db.dispose_engine()


app = FastAPI(title="Accountable", lifespan=lifespan)

for area in (organizations, contacts, deals, activities, dashboard):
    app.include_router(area.router, prefix="/api")

_MESSAGES = {
    "missing": "Required",
    "greater_than_equal": "Must be {ge} or more",
    "less_than_equal": "Must be {le} or less",
    "int_parsing": "Enter a whole number",
    "int_from_float": "Enter a whole number",
    "int_type": "Enter a whole number",
    "literal_error": "Choose one of the options",
    "date_from_datetime_parsing": "Enter a date",
    "date_parsing": "Enter a date",
    "datetime_from_date_parsing": "Enter a date and time",
    "datetime_parsing": "Enter a date and time",
}


def _friendly(error: dict) -> str:
    """Short, plain messages the form can show next to each field (V5)."""
    if error.get("input", ...) is None and error["type"] != "value_error":
        return "Required"
    template = _MESSAGES.get(error["type"])
    if template:
        return template.format(**error.get("ctx", {}))
    return error["msg"].removeprefix("Value error, ")


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    detail = [
        {"loc": list(e["loc"]), "msg": _friendly(e), "type": e["type"]} for e in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": detail})


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


if config.test_mode():
    # Only for the end-to-end tests: reload the sample data before each test.
    @app.post("/api/test/reset")
    def reset(large: bool = False) -> dict:
        from .seed import seed

        with db.get_engine().begin() as conn:
            seed(conn, large=large)
        return {"status": "reset"}
