import logging
import sys

import structlog
from asgi_correlation_id import correlation_id


def add_correlation(_logger, _log_method, event_dict):
    """Add request correlation ID to log event."""
    if request_id := correlation_id.get():
        event_dict["correlation_id"] = request_id
    return event_dict


def setup_logging():
    """Configure structured logging for the application."""

    # Processors applied to all logs (structlog + stdlib)
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        add_correlation,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.CallsiteParameterAdder(
            {
                structlog.processors.CallsiteParameter.FILENAME,
                structlog.processors.CallsiteParameter.FUNC_NAME,
                structlog.processors.CallsiteParameter.LINENO,
            }
        ),
        structlog.processors.StackInfoRenderer(),
    ]

    # Processors strictly for structlog (creating the event dict)
    structlog_processors = [
        *shared_processors,
        structlog.stdlib.filter_by_level,
        structlog.processors.UnicodeDecoder(),
        structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
    ]

    # Pretty console output when attached to a terminal (local dev),
    # JSON otherwise (containers, CI, production).
    if sys.stderr.isatty():
        renderer = structlog.dev.ConsoleRenderer()
    else:
        renderer = structlog.processors.JSONRenderer()

    # Configure structlog
    structlog.configure(
        processors=structlog_processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging to use structlog
    formatter = structlog.stdlib.ProcessorFormatter(
        # These run on ANY log message (stdlib or structlog)
        foreign_pre_chain=shared_processors,
        # These run on the FINAL event dict
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Clean up existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers = []
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    # Specifically set Uvicorn loggers to use our handler and propagate
    for _log in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
        logger = logging.getLogger(_log)
        logger.handlers = []
        logger.propagate = True


setup_logging()
logger = structlog.get_logger()
