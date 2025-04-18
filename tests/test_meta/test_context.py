"""
Tests for the context manager.
"""

import os
import pytest
from zangalewa.meta.context import ContextManager, ContextItem


def test_context_manager_init():
    """Test context manager initialization."""
    context_manager = ContextManager()
    assert len(context_manager.history) == 0
    assert context_manager.current_dir == os.getcwd()
    assert context_manager.user_preferences == {}


def test_update_context():
    """Test updating the context."""
    context_manager = ContextManager()
    
    # Add an item to the context
    context_manager.update("test content", "test_type")
    
    # Check that the item was added
    assert len(context_manager.history) == 1
    assert context_manager.history[0].item_type == "test_type"
    assert context_manager.history[0].content == "test content"
    assert "current_dir" in context_manager.history[0].metadata


def test_max_history_limit():
    """Test that history is trimmed to max_history."""
    context_manager = ContextManager(max_history=3)
    
    # Add more items than the max_history
    for i in range(5):
        context_manager.update(f"content {i}", "test_type")
    
    # Check that only the most recent items are kept
    assert len(context_manager.history) == 3
    assert context_manager.history[0].content == "content 2"
    assert context_manager.history[1].content == "content 3"
    assert context_manager.history[2].content == "content 4"


def test_update_working_directory(temp_dir):
    """Test updating the working directory."""
    context_manager = ContextManager()
    
    # Update the working directory
    context_manager.update_working_directory(temp_dir)
    
    # Check that the directory was updated
    assert context_manager.current_dir == temp_dir
    
    # Check that an event was added to the history
    assert len(context_manager.history) == 1
    assert context_manager.history[0].item_type == "system_event"
    assert f"Changed directory to {temp_dir}" in context_manager.history[0].content


def test_update_user_preference():
    """Test updating user preferences."""
    context_manager = ContextManager()
    
    # Update a user preference
    context_manager.update_user_preference("theme", "dark")
    
    # Check that the preference was updated
    assert context_manager.user_preferences["theme"] == "dark"
    
    # Check that an event was added to the history
    assert len(context_manager.history) == 1
    assert context_manager.history[0].item_type == "system_event"
    assert "Updated preference theme=dark" in context_manager.history[0].content


def test_get_conversation_history():
    """Test getting conversation history."""
    context_manager = ContextManager()
    
    # Add some items to the context
    context_manager.update("user message 1", "user_input")
    context_manager.update("assistant response 1", "assistant_response")
    context_manager.update("system event", "system_event")
    context_manager.update("user message 2", "user_input")
    context_manager.update("assistant response 2", "assistant_response")
    
    # Get conversation history
    history = context_manager.get_conversation_history()
    
    # Check that only user inputs and assistant responses are included
    assert len(history) == 4
    assert history[0]["role"] == "user"
    assert history[0]["content"] == "user message 1"
    assert history[1]["role"] == "assistant"
    assert history[1]["content"] == "assistant response 1"
    assert history[2]["role"] == "user"
    assert history[2]["content"] == "user message 2"
    assert history[3]["role"] == "assistant"
    assert history[3]["content"] == "assistant response 2"
    
    # Test with limit
    limited_history = context_manager.get_conversation_history(2)
    assert len(limited_history) == 2
    assert limited_history[0]["role"] == "user"
    assert limited_history[0]["content"] == "user message 2"
    assert limited_history[1]["role"] == "assistant"
    assert limited_history[1]["content"] == "assistant response 2" 