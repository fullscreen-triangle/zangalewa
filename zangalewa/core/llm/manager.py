"""
LLM Manager module for handling interactions with language models.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Union

from zangalewa.utils.config import get_config
from zangalewa.core.llm.prompts import load_system_prompt
from zangalewa.core.llm.adapters import (
    ModelAdapter, OpenAIAdapter, AnthropicAdapter, HuggingFaceAdapter
)

logger = logging.getLogger(__name__)

class LLMManager:
    """
    Manager for language model interactions, supporting both
    commercial and hosted models.
    """
    
    def __init__(self):
        """Initialize the LLM manager."""
        self.config = get_config()
        self.provider = self.config.get("LLM_PROVIDER", "huggingface")
        self.adapters = {}
        
        # Initialize adapters
        self._init_adapters()
        
        # Check if required models are available
        self._check_required_models()
    
    def _init_adapters(self):
        """Initialize model adapters based on configuration."""
        # Initialize HuggingFace adapters for different purposes
        huggingface_api_key = self.config.get("HUGGINGFACE_API_KEY")
        
        if not huggingface_api_key:
            logger.warning("HuggingFace API key not found. Most functionality will be unavailable.")
        
        # General purpose model
        general_model = self.config.get("HUGGINGFACE_GENERAL_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
        self.adapters["general"] = HuggingFaceAdapter(
            api_key=huggingface_api_key,
            model_name=general_model,
            use_local=False
        )
        logger.info(f"HuggingFace general adapter initialized with model: {general_model}")
        
        # Code generation model
        code_model = self.config.get("HUGGINGFACE_CODE_MODEL", "codellama/CodeLlama-7b-hf")
        self.adapters["code"] = HuggingFaceAdapter(
            api_key=huggingface_api_key,
            model_name=code_model,
            use_local=False
        )
        logger.info(f"HuggingFace code adapter initialized with model: {code_model}")
        
        # Frontend code model
        frontend_model = self.config.get("HUGGINGFACE_FRONTEND_MODEL", "deepseek-ai/deepseek-coder-6.7b-base")
        self.adapters["frontend"] = HuggingFaceAdapter(
            api_key=huggingface_api_key,
            model_name=frontend_model,
            use_local=False
        )
        logger.info(f"HuggingFace frontend adapter initialized with model: {frontend_model}")
        
        # Initialize commercial adapters if API keys are available (optional)
        openai_api_key = self.config.get("OPENAI_API_KEY")
        if openai_api_key:
            model = self.config.get("OPENAI_MODEL", "gpt-4")
            self.adapters["openai"] = OpenAIAdapter(openai_api_key, model)
            logger.info(f"OpenAI adapter initialized with model: {model}")
        
        anthropic_api_key = self.config.get("ANTHROPIC_API_KEY")
        if anthropic_api_key:
            model = self.config.get("ANTHROPIC_MODEL", "claude-2")
            self.adapters["anthropic"] = AnthropicAdapter(anthropic_api_key, model)
            logger.info(f"Anthropic adapter initialized with model: {model}")
        
        # Check which models are available
        available_models = []
        for name, adapter in self.adapters.items():
            if adapter.is_available():
                available_models.append(name)
        
        if available_models:
            logger.info(f"Available models: {', '.join(available_models)}")
    
    def _check_required_models(self):
        """
        Check if required models are available.
        Raises an error if required models are missing.
        """
        if not self.get_available_providers():
            error_message = (
                "No language models are available. Please ensure you have set the HUGGINGFACE_API_KEY "
                "environment variable or in your configuration file."
            )
            logger.error(error_message)
            raise RuntimeError(error_message)
    
    def get_available_providers(self) -> List[str]:
        """Get a list of available model providers."""
        return [name for name, adapter in self.adapters.items() if adapter.is_available()]
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        provider: Optional[str] = None,
        task_type: Optional[str] = None
    ) -> str:
        """
        Generate a response from the language model.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: Optional system prompt to use
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            provider: Specific provider to use (overrides default)
            task_type: Type of task (chat, python_code, react_code) to select appropriate model
            
        Returns:
            Generated text response
        """
        if not system_prompt:
            system_prompt = load_system_prompt("default")
        
        # Determine which provider to use based on task type
        provider_to_use = provider
        
        if not provider_to_use:
            if task_type == "python_code":
                provider_to_use = "code"  # Use code model for Python code
            elif task_type == "react_code":
                provider_to_use = "frontend"  # Use frontend model for React code
            elif task_type == "chat" or task_type is None:
                provider_to_use = "general"  # Use general model for chat/orchestration
            else:
                provider_to_use = self.provider  # Use configured provider
        
        # If auto, try to find the best available provider
        if provider_to_use == "auto":
            provider_to_use = self._select_best_provider(task_type)
        
        if provider_to_use in self.adapters and self.adapters[provider_to_use].is_available():
            return await self.adapters[provider_to_use].generate(
                messages, 
                system_prompt, 
                temperature, 
                max_tokens
            )
        else:
            # Try any available adapter
            available_providers = self.get_available_providers()
            if not available_providers:
                raise RuntimeError("No language models are available. Please set the HUGGINGFACE_API_KEY environment variable.")
            
            provider_to_use = available_providers[0]
            logger.info(f"Using available provider: {provider_to_use}")
            return await self.adapters[provider_to_use].generate(
                messages, 
                system_prompt, 
                temperature, 
                max_tokens
            )
    
    def _select_best_provider(self, task_type: Optional[str] = None) -> str:
        """
        Select the best available provider based on task needs and availability.
        
        Args:
            task_type: Type of task (chat, python_code, react_code)
            
        Returns:
            Provider name to use
        """
        available_providers = self.get_available_providers()
        
        # Task-specific model selection
        if task_type == "python_code" and "code" in available_providers:
            return "code"
        elif task_type == "react_code" and "frontend" in available_providers:
            return "frontend"
        elif (task_type == "chat" or task_type is None) and "general" in available_providers:
            return "general"
        
        # If commercial models are available, use them for complex tasks
        if "openai" in available_providers:
            return "openai"
        elif "anthropic" in available_providers:
            return "anthropic"
        
        # If HuggingFace models are available, use them
        if "general" in available_providers:
            return "general"
        elif "code" in available_providers:
            return "code"
        elif "frontend" in available_providers:
            return "frontend"
        
        # No models available
        raise RuntimeError("No language models are available. Please set the HUGGINGFACE_API_KEY environment variable.") 