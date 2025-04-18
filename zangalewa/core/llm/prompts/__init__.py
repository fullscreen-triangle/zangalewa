"""
System prompts for LLM interactions.
"""

import os
import json
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Directory containing prompt templates
PROMPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def load_system_prompt(prompt_name: str) -> str:
    """
    Load a system prompt from the prompts directory.
    
    Args:
        prompt_name: Name of the prompt file (without extension)
        
    Returns:
        The system prompt text
        
    Raises:
        FileNotFoundError: If the prompt file doesn't exist
    """
    prompt_path = os.path.join(PROMPTS_DIR, f"{prompt_name}.txt")
    
    try:
        with open(prompt_path, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        logger.error(f"System prompt not found: {prompt_name}")
        # Return a basic fallback prompt
        return "You are Zangalewa, an AI-powered command-line assistant for bioinformatics and technical workflows. Help the user with their request." 