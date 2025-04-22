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
    """Adapter for Hugging Face models."""
    
    def __init__(self, api_key=None, model_name=None, use_local=False, device=None, 
                 load_in_4bit=False, load_in_8bit=False):
        """
        Initialize the Hugging Face adapter.
        
        Args:
            api_key: Hugging Face API key (for API-based models)
            model_name: Name of the model to use
            use_local: Whether to use a local model (True) or API (False)
            device: Device to load model on ("cpu", "cuda:0", "auto", etc.)
            load_in_4bit: Whether to use 4-bit quantization (requires bitsandbytes)
            load_in_8bit: Whether to use 8-bit quantization (requires bitsandbytes)
        """
        self.api_key = api_key
        self.model_name = model_name or "mistralai/Mistral-7B-Instruct-v0.2"
        self.use_local = use_local
        self.device = device or "auto"
        self.load_in_4bit = load_in_4bit
        self.load_in_8bit = load_in_8bit
        
        # Initialize clients based on mode (API or local)
        self.client = None
        self.tokenizer = None
        self.model = None
        
        if not use_local and api_key:
            try:
                from huggingface_hub.inference_api import InferenceApi
                self.client = InferenceApi(
                    repo_id=self.model_name,
                    token=self.api_key
                )
                logger.info(f"Initialized Hugging Face API client for model: {self.model_name}")
            except ImportError:
                logger.warning("huggingface_hub not installed, cannot use Hugging Face API")
            except Exception as e:
                logger.error(f"Failed to initialize Hugging Face API client: {e}")
        elif use_local:
            # Local model will be loaded on first use to avoid startup delays
            logger.info(f"Hugging Face local adapter initialized for model: {self.model_name}")
            
    async def _load_local_model(self):
        """Load the local Hugging Face model if not already loaded."""
        if self.model is not None and self.tokenizer is not None:
            return True
            
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
            import torch
            
            logger.info(f"Loading local Hugging Face model: {self.model_name}")
            
            # Determine quantization config
            quantization_config = None
            if self.load_in_4bit or self.load_in_8bit:
                try:
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=self.load_in_4bit,
                        load_in_8bit=self.load_in_8bit,
                        bnb_4bit_compute_dtype=torch.float16
                    )
                except ImportError:
                    logger.warning("bitsandbytes not installed, cannot use quantization")
            
            # Determine device mapping
            device_map = self.device if self.device != "auto" else "auto"
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True
            )
            
            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                quantization_config=quantization_config,
                device_map=device_map,
                trust_remote_code=True,
                torch_dtype=torch.float16 if device_map != "cpu" else None
            )
            
            logger.info(f"Successfully loaded local Hugging Face model: {self.model_name}")
            return True
        except ImportError as e:
            logger.error(f"Required packages not installed for local Hugging Face models: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to load local Hugging Face model: {e}")
            return False
    
    def is_available(self):
        """Check if the Hugging Face model is available."""
        if not self.use_local and self.api_key:
            return self.client is not None
        elif self.use_local:
            try:
                import transformers
                import torch
                return True
            except ImportError:
                return False
        return False
    
    async def generate(self, messages, system_prompt=None, temperature=0.7, max_tokens=1000):
        """
        Generate a response from the Hugging Face model.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: System prompt to prepend
            temperature: Sampling temperature
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            Generated text
        """
        # Format messages according to model requirements
        formatted_prompt = self._format_messages(messages, system_prompt)
        
        if not self.use_local and self.client:
            # API-based generation
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
        elif self.use_local:
            # Local model generation
            if not await self._load_local_model():
                raise RuntimeError("Failed to load local Hugging Face model")
            
            try:
                import torch
                from transformers import TextIteratorStreamer
                from threading import Thread
                
                inputs = self.tokenizer(formatted_prompt, return_tensors="pt")
                inputs = inputs.to(self.model.device)
                
                # Set generation parameters
                generation_config = {
                    "max_new_tokens": max_tokens,
                    "temperature": temperature,
                    "do_sample": temperature > 0,
                    "top_p": 0.95,
                    "repetition_penalty": 1.1
                }
                
                # Generate response
                with torch.no_grad():
                    output = self.model.generate(
                        inputs["input_ids"],
                        attention_mask=inputs.get("attention_mask", None),
                        **generation_config
                    )
                
                # Decode and return response
                response = self.tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
                return response
            except Exception as e:
                logger.error(f"Error generating text with local Hugging Face model: {e}")
                raise RuntimeError(f"Failed to generate text with local Hugging Face model: {e}")
        else:
            raise RuntimeError("Hugging Face model is not available")
    
    def _format_messages(self, messages, system_prompt=None):
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
            # Use Llama/Mistral chat template if available in newer transformers
            if self.tokenizer and hasattr(self.tokenizer, "apply_chat_template"):
                try:
                    # Convert messages to format expected by apply_chat_template
                    formatted_messages = []
                    if system_prompt:
                        formatted_messages.append({"role": "system", "content": system_prompt})
                    formatted_messages.extend(messages)
                    
                    return self.tokenizer.apply_chat_template(
                        formatted_messages, 
                        tokenize=False, 
                        add_generation_prompt=True
                    )
                except Exception as e:
                    logger.warning(f"Failed to use chat template: {e}, falling back to manual format")
            
            # Manual Llama 2 format
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