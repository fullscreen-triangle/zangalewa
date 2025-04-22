"""
LLM integration module for Zangalewa, providing interfaces to 
language models like OpenAI's GPT, Anthropic's Claude, and local models.
"""

from zangalewa.core.llm.manager import LLMManager
from zangalewa.core.llm.adapters import (
    ModelAdapter, OpenAIAdapter, AnthropicAdapter,
    OllamaAdapter, MistralAdapter, CodeLlamaAdapter, DeepSeekCoderAdapter, HuggingFaceAdapter
)

__all__ = [
    "LLMManager",
    "ModelAdapter",
    "OpenAIAdapter",
    "AnthropicAdapter",
    "OllamaAdapter",
    "MistralAdapter",
    "CodeLlamaAdapter",
    "DeepSeekCoderAdapter",
    "HuggingFaceAdapter",
] 