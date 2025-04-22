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
    ModelAdapter, OpenAIAdapter, AnthropicAdapter,
    OllamaAdapter, MistralAdapter, CodeLlamaAdapter, DeepSeekCoderAdapter, HuggingFaceAdapter
)

logger = logging.getLogger(__name__)

class LLMManager:
    """
    Manager for language model interactions, supporting both
    commercial and open-source/local models.
    """
    
    def __init__(self):
        """Initialize the LLM manager."""
        self.config = get_config()
        self.provider = self.config.get("LLM_PROVIDER", "auto")
        self.adapters = {}
        
        # Initialize adapters
        self._init_adapters()
        
        # Check if required models are available
        self._check_required_models()
    
    def _init_adapters(self):
        """Initialize model adapters based on configuration."""
        # Initialize local model adapters - these are REQUIRED
        self.adapters["mistral"] = MistralAdapter()
        self.adapters["codellama"] = CodeLlamaAdapter()
        self.adapters["deepseek"] = DeepSeekCoderAdapter()
        self.adapters["ollama"] = OllamaAdapter(self.config.get("OLLAMA_MODEL", "mistral"))
        
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
        
        # Initialize HuggingFace API adapter if API key is available
        huggingface_api_key = self.config.get("HUGGINGFACE_API_KEY")
        if huggingface_api_key:
            model = self.config.get("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
            self.adapters["huggingface"] = HuggingFaceAdapter(
                api_key=huggingface_api_key, 
                model_name=model,
                use_local=False
            )
            logger.info(f"Hugging Face API adapter initialized with model: {model}")
        
        # Initialize local HuggingFace adapter if configured
        try:
            # Check if local_huggingface config section is present
            local_hf_config = self.config.get("llm", {}).get("local_huggingface", {})
            if local_hf_config:
                model = local_hf_config.get("model", "mistralai/Mistral-7B-Instruct-v0.2")
                device = local_hf_config.get("device", "auto")
                load_in_4bit = local_hf_config.get("load_in_4bit", True)
                load_in_8bit = local_hf_config.get("load_in_8bit", False)
                
                self.adapters["local_huggingface"] = HuggingFaceAdapter(
                    api_key=None,
                    model_name=model,
                    use_local=True,
                    device=device,
                    load_in_4bit=load_in_4bit,
                    load_in_8bit=load_in_8bit
                )
                logger.info(f"Local Hugging Face adapter initialized with model: {model}")
        except Exception as e:
            logger.warning(f"Failed to initialize local Hugging Face adapter: {e}")
        
        # Check which local models are available
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
        required_models = {
            "mistral": "general interaction and orchestration",
            "codellama": "Python code generation and analysis",
            "deepseek": "React and general code generation"
        }
        
        missing_models = []
        for model_name, purpose in required_models.items():
            if model_name not in self.adapters or not self.adapters[model_name].is_available():
                missing_models.append(f"{model_name} (for {purpose})")
        
        if missing_models:
            error_message = (
                f"Required models are not available: {', '.join(missing_models)}. "
                f"Please install the missing models using 'zangalewa models setup --all'. "
                f"Zangalewa requires these local models to function."
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
                provider_to_use = "codellama"  # Use CodeLlama for Python code
            elif task_type == "react_code":
                provider_to_use = "deepseek"   # Use DeepSeek for React code
            elif task_type == "chat" or task_type is None:
                provider_to_use = "mistral"    # Use Mistral for general chat/orchestration
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
                raise RuntimeError("No language models are available. Please install Ollama and run 'zangalewa models setup --all'.")
            
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
        if task_type == "python_code" and "codellama" in available_providers:
            return "codellama"
        elif task_type == "react_code" and "deepseek" in available_providers:
            return "deepseek"
        elif (task_type == "chat" or task_type is None) and "mistral" in available_providers:
            return "mistral"
        
        # If commercial models are available, use them for complex tasks
        if "openai" in available_providers:
            return "openai"
        elif "anthropic" in available_providers:
            return "anthropic"
        elif "huggingface" in available_providers:
            return "huggingface"
        
        # If local HuggingFace model is available, use it
        if "local_huggingface" in available_providers:
            return "local_huggingface"
        
        # If local models are available, use them based on preference
        if "codellama" in available_providers:
            return "codellama"
        elif "deepseek" in available_providers:
            return "deepseek"
        elif "mistral" in available_providers:
            return "mistral"
        elif "ollama" in available_providers:
            return "ollama"
        
        # No models available
        raise RuntimeError("No language models are available. Please install Ollama and run 'zangalewa models setup --all'.") 