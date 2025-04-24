"""
Utility functions for interacting with the HuggingFace API.
"""

import logging
import requests
from typing import Dict, List, Optional, Union, Any

from zangalewa.utils.config import get_config

logger = logging.getLogger(__name__)

def get_api_key() -> Optional[str]:
    """
    Get the HuggingFace API key from configuration.
    
    Returns:
        The API key if available, otherwise None
    """
    config = get_config()
    return config.get("HUGGINGFACE_API_KEY")

def check_api_key_valid(api_key: str) -> bool:
    """
    Check if the provided HuggingFace API key is valid.
    
    Args:
        api_key: The HuggingFace API key to validate
        
    Returns:
        True if the API key is valid, False otherwise
    """
    try:
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(
            "https://huggingface.co/api/whoami",
            headers=headers,
            timeout=10
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Error validating HuggingFace API key: {e}")
        return False

def get_model_info(model_id: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Get information about a HuggingFace model.
    
    Args:
        model_id: The ID of the model
        api_key: Optional API key (will use configured key if not provided)
        
    Returns:
        Dictionary containing model information
    """
    if not api_key:
        api_key = get_api_key()
    
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    try:
        response = requests.get(
            f"https://huggingface.co/api/models/{model_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to get model info for {model_id}: {response.status_code}")
            return {}
    except Exception as e:
        logger.error(f"Error getting model info for {model_id}: {e}")
        return {}

def get_available_models(task: str = "text-generation", api_key: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get a list of available models for a specific task.
    
    Args:
        task: The task to filter models by (e.g. 'text-generation')
        api_key: Optional API key (will use configured key if not provided)
        
    Returns:
        List of dictionaries containing model information
    """
    if not api_key:
        api_key = get_api_key()
    
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    try:
        params = {
            "limit": 100,
            "filter": task,
            "sort": "downloads",
            "direction": -1
        }
        
        response = requests.get(
            "https://huggingface.co/api/models",
            headers=headers,
            params=params,
            timeout=15
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to get models for task {task}: {response.status_code}")
            return []
    except Exception as e:
        logger.error(f"Error getting models for task {task}: {e}")
        return []

def get_recommended_models() -> Dict[str, str]:
    """
    Get a dictionary of recommended models for different purposes.
    
    Returns:
        Dictionary mapping purpose to model ID
    """
    # Get from config if available, otherwise use defaults
    config = get_config()
    huggingface_models = config.get("llm", {}).get("huggingface_models", {})
    
    if huggingface_models:
        return huggingface_models
    
    # Default recommendations
    return {
        "general": "mistralai/Mistral-7B-Instruct-v0.2",
        "code": "codellama/CodeLlama-7b-hf",
        "frontend": "deepseek-ai/deepseek-coder-6.7b-base"
    } 