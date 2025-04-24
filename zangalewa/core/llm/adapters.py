"""
Model adapters for connecting to various LLM backends.

This module provides adapters for various LLM providers, both commercial
and open-source/local models.
"""

import os
import json
import logging
import subprocess
import requests
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union

logger = logging.getLogger(__name__)

class ModelAdapter(ABC):
    """Base class for model adapters."""
    
    @abstractmethod
    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> str:
        """Generate a response from the model."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the model is available."""
        pass


class OllamaAdapter(ModelAdapter):
    """Adapter for Ollama models."""
    
    def __init__(self, model_name: str = "mistral"):
        """
        Initialize the Ollama adapter.
        
        Args:
            model_name: Name of the Ollama model to use
        """
        self.model_name = model_name
        self.base_url = "http://localhost:11434/api"
    
    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> str:
        """Generate a response using Ollama."""
        if not self.is_available():
            raise RuntimeError(f"Ollama model '{self.model_name}' is not available")
        
        # Convert messages to Ollama format
        prompt = system_prompt + "\n\n"
        
        for message in messages:
            role = message["role"]
            content = message["content"]
            
            if role == "user":
                prompt += f"User: {content}\n\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n\n"
        
        prompt += "Assistant: "
        
        # Call Ollama API
        try:
            response = requests.post(
                f"{self.base_url}/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                },
                timeout=60
            )
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
        except Exception as e:
            logger.error(f"Error generating response from Ollama: {e}")
            raise
    
    def is_available(self) -> bool:
        """Check if the Ollama model is available."""
        try:
            response = requests.get(f"{self.base_url}/tags", timeout=5)
            if response.status_code != 200:
                return False
            
            models = response.json().get("models", [])
            for model in models:
                if model.get("name") == self.model_name:
                    return True
            
            return False
        except Exception:
            return False


class MistralAdapter(OllamaAdapter):
    """Adapter for Mistral 7B model via Ollama."""
    
    def __init__(self):
        """Initialize the Mistral adapter."""
        super().__init__(model_name="mistral")


class CodeLlamaAdapter(OllamaAdapter):
    """Adapter for CodeLlama:7b-python model via Ollama."""
    
    def __init__(self):
        """Initialize the CodeLlama adapter."""
        super().__init__(model_name="codellama:7b-python")


class DeepSeekCoderAdapter(OllamaAdapter):
    """Adapter for DeepSeek-Coder:6.7b model via Ollama."""
    
    def __init__(self):
        """Initialize the DeepSeek-Coder adapter."""
        super().__init__(model_name="deepseek-coder:6.7b")


class OpenAIAdapter(ModelAdapter):
    """Adapter for OpenAI models."""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4"):
        """
        Initialize the OpenAI adapter.
        
        Args:
            api_key: OpenAI API key
            model_name: Name of the OpenAI model to use
        """
        self.api_key = api_key
        self.model_name = model_name
        self.client = None
        
        if api_key:
            import openai
            self.client = openai.OpenAI(api_key=api_key)
    
    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> str:
        """Generate a response using OpenAI."""
        if not self.is_available():
            raise RuntimeError("OpenAI client is not available")
        
        formatted_messages = [{"role": "system", "content": system_prompt}]
        formatted_messages.extend(messages)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error generating response from OpenAI: {e}")
            raise
    
    def is_available(self) -> bool:
        """Check if the OpenAI client is available."""
        return self.client is not None


class AnthropicAdapter(ModelAdapter):
    """Adapter for Anthropic models."""
    
    def __init__(self, api_key: str, model_name: str = "claude-2"):
        """
        Initialize the Anthropic adapter.
        
        Args:
            api_key: Anthropic API key
            model_name: Name of the Anthropic model to use
        """
        self.api_key = api_key
        self.model_name = model_name
        self.client = None
        
        if api_key:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=api_key)
    
    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> str:
        """Generate a response using Anthropic."""
        if not self.is_available():
            raise RuntimeError("Anthropic client is not available")
        
        # Convert messages to Anthropic format
        prompt = f"{system_prompt}\n\n"
        
        for message in messages:
            role = message["role"]
            content = message["content"]
            
            if role == "user":
                prompt += f"Human: {content}\n\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n\n"
        
        prompt += "Assistant: "
        
        try:
            response = await self.client.completions.create(
                prompt=prompt,
                model=self.model_name,
                max_tokens_to_sample=max_tokens,
                temperature=temperature
            )
            
            return response.completion
        except Exception as e:
            logger.error(f"Error generating response from Anthropic: {e}")
            raise
    
    def is_available(self) -> bool:
        """Check if the Anthropic client is available."""
        return self.client is not None


class HuggingFaceAdapter(ModelAdapter):
    """Adapter for Hugging Face models via their API."""
    
    def __init__(self, api_key=None, model_name=None):
        """
        Initialize the Hugging Face adapter.
        
        Args:
            api_key: Hugging Face API key
            model_name: Name of the model to use
        """
        self.api_key = api_key
        self.model_name = model_name or "mistralai/Mistral-7B-Instruct-v0.2"
        self.client = None
        
        if api_key:
            try:
                from huggingface_hub.inference_api import InferenceApi
                self.client = InferenceApi(
                    repo_id=self.model_name,
                    token=self.api_key
                )
                logger.info(f"Initialized Hugging Face API client for model: {self.model_name}")
            except ImportError:
                logger.warning("huggingface_hub not installed, cannot use Hugging Face API")
                logger.warning("Please install with: pip install huggingface_hub")
            except Exception as e:
                logger.error(f"Failed to initialize Hugging Face API client: {e}")
    
    def is_available(self) -> bool:
        """Check if the Hugging Face API is available."""
        return self.client is not None
    
    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> str:
        """
        Generate a response from the Hugging Face model via API.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: System prompt to prepend
            temperature: Sampling temperature
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            Generated text
        """
        if not self.is_available():
            raise RuntimeError("Hugging Face API client is not available")
        
        # Format messages according to model requirements
        formatted_prompt = self._format_messages(messages, system_prompt)
        
        try:
            response = self.client.text_generation(
                prompt=formatted_prompt,
                parameters={
                    "temperature": temperature,
                    "max_new_tokens": max_tokens,
                    "return_full_text": False
                }
            )
            return response
        except Exception as e:
            logger.error(f"Error generating text with Hugging Face API: {e}")
            raise RuntimeError(f"Failed to generate text with Hugging Face API: {e}")
    
    def _format_messages(self, messages: List[Dict[str, str]], system_prompt: str = None) -> str:
        """
        Format messages for the Hugging Face model.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: Optional system prompt
            
        Returns:
            Formatted prompt string
        """
        # Detect model type by name to determine formatting
        model_name_lower = self.model_name.lower()
        
        if "llama" in model_name_lower or "mistral" in model_name_lower:
            # Manual Llama 2/Mistral format
            formatted_prompt = ""
            if system_prompt:
                formatted_prompt += f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n"
            else:
                formatted_prompt += "<s>[INST] "
                
            for i, message in enumerate(messages):
                role = message["role"]
                content = message["content"]
                
                if i == 0 and role == "user":
                    if system_prompt:
                        formatted_prompt += f"{content} [/INST]"
                    else:
                        formatted_prompt += f"{content} [/INST]"
                elif role == "user":
                    formatted_prompt += f"\n\n<s>[INST] {content} [/INST]"
                elif role == "assistant":
                    formatted_prompt += f" {content} </s>"
                    
            return formatted_prompt
            
        elif "falcon" in model_name_lower:
            # Falcon format
            formatted_prompt = ""
            if system_prompt:
                formatted_prompt += f"System: {system_prompt}\n\n"
                
            for message in messages:
                role = message["role"]
                content = message["content"]
                
                if role == "user":
                    formatted_prompt += f"User: {content}\n"
                elif role == "assistant":
                    formatted_prompt += f"Assistant: {content}\n"
                    
            formatted_prompt += "Assistant: "
            return formatted_prompt
            
        else:
            # Generic format for other models
            formatted_prompt = ""
            if system_prompt:
                formatted_prompt += f"{system_prompt}\n\n"
                
            for message in messages:
                role = message["role"]
                content = message["content"]
                
                if role == "user":
                    formatted_prompt += f"User: {content}\n"
                elif role == "assistant":
                    formatted_prompt += f"Assistant: {content}\n"
                    
            formatted_prompt += "Assistant: "
            return formatted_prompt 