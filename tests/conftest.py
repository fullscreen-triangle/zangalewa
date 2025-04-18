"""
Common test fixtures and configuration for Zangalewa tests.
"""

import os
import pytest
import tempfile
from typing import Dict, Any

from zangalewa.core.llm import LLMManager
from zangalewa.core.executor import CommandExecutor
from zangalewa.meta.context import ContextManager


@pytest.fixture
def temp_dir():
    """Create a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdirname:
        yield tmpdirname


@pytest.fixture
def test_config() -> Dict[str, Any]:
    """Return a test configuration."""
    return {
        "LLM_PROVIDER": "openai",
        "OPENAI_MODEL": "gpt-3.5-turbo",
        "ANTHROPIC_MODEL": "claude-instant-1",
        "LOG_LEVEL": "DEBUG",
        "THEME": "default",
        "MAX_HISTORY": 10,
        "COMMAND_TIMEOUT": 5.0
    }


@pytest.fixture
def context_manager():
    """Create a context manager for tests."""
    return ContextManager(max_history=10)


@pytest.fixture
def command_executor():
    """Create a command executor for tests."""
    return CommandExecutor()


@pytest.fixture
def mock_llm_manager(monkeypatch):
    """Create a mock LLM manager that doesn't make actual API calls."""
    class MockLLMManager(LLMManager):
        async def generate_response(self, messages, system_prompt=None, temperature=0.7, max_tokens=1000):
            """Mock response generation without API calls."""
            return "This is a mock response for testing."
    
    return MockLLMManager() 