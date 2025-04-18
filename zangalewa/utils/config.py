"""
Configuration management for Zangalewa.

This module handles loading and merging configurations from multiple sources:
1. Default configuration files (YAML)
2. Environment-specific configuration files (YAML)
3. Environment variables
4. Command-line arguments
"""

import os
import yaml
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Configuration paths
CONFIG_DIR = Path(__file__).parent.parent.parent / "config"
DEFAULT_CONFIG_PATH = CONFIG_DIR / "default.yaml"

# Environment variable prefix
ENV_PREFIX = "ZANGALEWA_"

# Global configuration
_config = {}


def _deep_merge(source: Dict[str, Any], destination: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep merge two dictionaries. Values in source will override destination.
    
    Args:
        source: Source dictionary with higher precedence
        destination: Destination dictionary with lower precedence
        
    Returns:
        Merged dictionary
    """
    for key, value in source.items():
        if isinstance(value, dict):
            # Get node or create one
            node = destination.setdefault(key, {})
            if isinstance(node, dict):
                _deep_merge(value, node)
            else:
                destination[key] = value
        else:
            destination[key] = value
    return destination


def _load_yaml_config(path: Path) -> Dict[str, Any]:
    """
    Load configuration from a YAML file.
    
    Args:
        path: Path to the YAML file
        
    Returns:
        Dictionary containing configuration values
    """
    try:
        if path.exists():
            with open(path, 'r') as f:
                return yaml.safe_load(f) or {}
        else:
            logger.warning(f"Configuration file not found: {path}")
            return {}
    except Exception as e:
        logger.error(f"Error loading configuration from {path}: {e}")
        return {}


def _load_env_vars() -> Dict[str, Any]:
    """
    Load configuration from environment variables with the ZANGALEWA_ prefix.
    
    Environment variables are converted to nested dictionaries based on underscores.
    For example, ZANGALEWA_LLM_OPENAI_MODEL becomes {"llm": {"openai": {"model": value}}}.
    
    Returns:
        Dictionary containing configuration values from environment variables
    """
    result = {}
    for key, value in os.environ.items():
        if key.startswith(ENV_PREFIX):
            # Remove prefix and convert to lowercase
            config_key = key[len(ENV_PREFIX):].lower()
            
            # Split by underscore to create nested structure
            parts = config_key.split('_')
            
            # Build nested dictionary
            current = result
            for i, part in enumerate(parts):
                if i == len(parts) - 1:  # Last part
                    # Try to convert to appropriate type
                    if value.lower() == 'true':
                        current[part] = True
                    elif value.lower() == 'false':
                        current[part] = False
                    elif value.isdigit():
                        current[part] = int(value)
                    elif value.replace('.', '', 1).isdigit() and value.count('.') == 1:
                        current[part] = float(value)
                    else:
                        current[part] = value
                else:
                    current.setdefault(part, {})
                    current = current[part]
                    
    return result


def load_config(environment: Optional[str] = None) -> Dict[str, Any]:
    """
    Load and merge configuration from all sources.
    
    Args:
        environment: The environment to load configuration for (e.g., 'development', 'production')
                    If None, it will be determined from the ZANGALEWA_ENV environment variable
                    or default to 'development'.
                    
    Returns:
        Merged configuration dictionary
    """
    global _config
    
    # Load environment variables from .env file if it exists
    load_dotenv()
    
    # Determine environment
    if environment is None:
        environment = os.getenv(f"{ENV_PREFIX}ENV", "development").lower()
        
    logger.info(f"Loading configuration for environment: {environment}")
    
    # Load default configuration
    config = _load_yaml_config(DEFAULT_CONFIG_PATH)
    
    # Load environment-specific configuration
    env_config_path = CONFIG_DIR / f"{environment}.yaml"
    env_config = _load_yaml_config(env_config_path)
    
    # Merge configurations
    config = _deep_merge(env_config, config)
    
    # Load environment variables
    env_vars = _load_env_vars()
    
    # Merge environment variables
    config = _deep_merge(env_vars, config)
    
    # Store in global variable
    _config = config
    
    return config


def get_config() -> Dict[str, Any]:
    """
    Get the current configuration. Loads configuration if not already loaded.
    
    Returns:
        The current configuration dictionary
    """
    global _config
    if not _config:
        load_config()
    return _config


def get_config_value(key_path: str, default: Any = None) -> Any:
    """
    Get a configuration value by its key path.
    
    Args:
        key_path: Dot-separated path to the configuration value (e.g., 'llm.openai.model')
        default: Default value to return if the key doesn't exist
        
    Returns:
        Configuration value or default if not found
    """
    config = get_config()
    keys = key_path.split('.')
    
    # Navigate through the nested dictionary
    curr = config
    for key in keys:
        if isinstance(curr, dict) and key in curr:
            curr = curr[key]
        else:
            return default
            
    return curr 