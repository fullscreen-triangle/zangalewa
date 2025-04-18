"""
LLM Manager module for handling interactions with language models.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Union

import openai
from anthropic import Anthropic

from zangalewa.utils.config import get_config
from zangalewa.core.llm.prompts import load_system_prompt

logger = logging.getLogger(__name__)

class LLMManager:
    """
    Manager for language model interactions, supporting both
    OpenAI and Anthropic models.
    """
    
    def __init__(self):
        """Initialize the LLM manager."""
        self.config = get_config()
        self.provider = self.config.get("LLM_PROVIDER", "openai")
        self.openai_model = self.config.get("OPENAI_MODEL", "gpt-4")
        self.anthropic_model = self.config.get("ANTHROPIC_MODEL", "claude-2")
        
        # Initialize API clients
        self._init_clients()
    
    def _init_clients(self):
        """Initialize API clients based on configuration."""
        if self.provider == "openai" or self.provider == "both":
            openai_api_key = self.config.get("OPENAI_API_KEY")
            if openai_api_key:
                self.openai_client = openai.OpenAI(api_key=openai_api_key)
                logger.info("OpenAI client initialized.")
            else:
                logger.warning("OpenAI API key not found. OpenAI features disabled.")
                self.openai_client = None
        
        if self.provider == "anthropic" or self.provider == "both":
            anthropic_api_key = self.config.get("ANTHROPIC_API_KEY")
            if anthropic_api_key:
                self.anthropic_client = Anthropic(api_key=anthropic_api_key)
                logger.info("Anthropic client initialized.")
            else:
                logger.warning("Anthropic API key not found. Anthropic features disabled.")
                self.anthropic_client = None
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """
        Generate a response from the language model.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            system_prompt: Optional system prompt to use
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        if not system_prompt:
            system_prompt = load_system_prompt("default")
        
        if self.provider == "openai":
            return await self._generate_openai(messages, system_prompt, temperature, max_tokens)
        elif self.provider == "anthropic":
            return await self._generate_anthropic(messages, system_prompt, temperature, max_tokens)
        else:
            # Try OpenAI first, fall back to Anthropic
            try:
                return await self._generate_openai(messages, system_prompt, temperature, max_tokens)
            except Exception as e:
                logger.warning(f"OpenAI generation failed, falling back to Anthropic: {e}")
                return await self._generate_anthropic(messages, system_prompt, temperature, max_tokens)
    
    async def _generate_openai(
        self, 
        messages: List[Dict[str, str]], 
        system_prompt: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """Generate a response using OpenAI."""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized.")
        
        # Prepare messages with system prompt
        formatted_messages = [{"role": "system", "content": system_prompt}]
        formatted_messages.extend(messages)
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.openai_model,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract the response text
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating OpenAI response: {e}")
            raise
    
    async def _generate_anthropic(
        self, 
        messages: List[Dict[str, str]], 
        system_prompt: str,
        temperature: float,
        max_tokens: int
    ) -> str:
        """Generate a response using Anthropic."""
        if not self.anthropic_client:
            raise ValueError("Anthropic client not initialized.")
        
        # Convert message format for Anthropic
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
            response = await self.anthropic_client.completions.create(
                prompt=prompt,
                model=self.anthropic_model,
                max_tokens_to_sample=max_tokens,
                temperature=temperature
            )
            
            # Extract the response text
            return response.completion
            
        except Exception as e:
            logger.error(f"Error generating Anthropic response: {e}")
            raise 