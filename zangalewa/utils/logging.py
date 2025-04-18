"""
Logging utilities for setting up application logging.
"""

import os
import logging
import sys
from pathlib import Path
from typing import Optional

from zangalewa.utils.config import get_config

# Default log directory
LOG_DIR = os.path.join(str(Path.home()), ".zangalewa", "logs")


def setup_logging(log_level: Optional[str] = None) -> logging.Logger:
    """
    Set up logging for the application.
    
    Args:
        log_level: Optional log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        
    Returns:
        Root logger
    """
    # Get log level from config if not provided
    if log_level is None:
        log_level = get_config("LOG_LEVEL", "INFO")
    
    # Convert string to logging level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create logs directory if it doesn't exist
    os.makedirs(LOG_DIR, exist_ok=True)
    
    # Set up logging
    log_file = os.path.join(LOG_DIR, "zangalewa.log")
    
    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Get the root logger
    logger = logging.getLogger("zangalewa")
    
    # Set log level
    logger.setLevel(numeric_level)
    
    # Set lower log level for third-party libraries
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("anthropic").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    
    logger.debug(f"Logging initialized at level {log_level}")
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger for a specific module.
    
    Args:
        name: Name of the module
        
    Returns:
        Logger for the module
    """
    return logging.getLogger(f"zangalewa.{name}") 