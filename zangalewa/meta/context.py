"""
Context manager for tracking user session context.
"""

import os
import time
import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class ContextItem:
    """An item in the user context."""
    item_type: str  # Type of context item (command, response, error, etc.)
    content: Any  # Content of the context item
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


class ContextManager:
    """
    Manages the user session context, including conversation history,
    current working directory, environment, and user preferences.
    """
    
    def __init__(self, max_history: int = 100):
        """
        Initialize the context manager.
        
        Args:
            max_history: Maximum number of context items to keep
        """
        self.history: List[ContextItem] = []
        self.max_history = max_history
        self.current_dir = os.getcwd()
        self.environment = os.environ.copy()
        self.user_preferences = {}
        
    def update(self, content: Any, item_type: str = "user_input", metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Update the context with a new item.
        
        Args:
            content: Content to add to the context
            item_type: Type of the context item
            metadata: Additional metadata for the context item
        """
        if metadata is None:
            metadata = {}
            
        # Add current directory to metadata
        metadata["current_dir"] = self.current_dir
        
        # Create and add context item
        item = ContextItem(
            item_type=item_type,
            content=content,
            timestamp=time.time(),
            metadata=metadata
        )
        self.history.append(item)
        
        # Trim history if necessary
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
            
        logger.debug(f"Added context item of type {item_type}")
        
    def get_current_context(self) -> Dict[str, Any]:
        """
        Get the current context as a dictionary.
        
        Returns:
            Dictionary with current context
        """
        return {
            "history": self.history[-10:],  # Last 10 items
            "current_dir": self.current_dir,
            "user_preferences": self.user_preferences
        }
        
    def update_working_directory(self, new_dir: str) -> None:
        """
        Update the current working directory.
        
        Args:
            new_dir: New working directory
        """
        if os.path.isdir(new_dir):
            self.current_dir = new_dir
            self.update(f"Changed directory to {new_dir}", "system_event", {"action": "cd"})
            logger.debug(f"Updated working directory to {new_dir}")
        else:
            logger.warning(f"Attempted to change to non-existent directory: {new_dir}")
            
    def update_user_preference(self, key: str, value: Any) -> None:
        """
        Update a user preference.
        
        Args:
            key: Preference key
            value: Preference value
        """
        self.user_preferences[key] = value
        self.update(f"Updated preference {key}={value}", "system_event", 
                    {"action": "set_preference", "key": key, "value": value})
        logger.debug(f"Updated user preference {key}={value}")
        
    def get_conversation_history(self, n: Optional[int] = None) -> List[Dict[str, str]]:
        """
        Get the conversation history in a format suitable for LLM context.
        
        Args:
            n: Number of most recent conversation items to return (None for all)
            
        Returns:
            List of conversation messages in LLM format
        """
        # Filter for user inputs and assistant responses
        conversation = []
        
        for item in self.history:
            if item.item_type == "user_input":
                conversation.append({"role": "user", "content": item.content})
            elif item.item_type == "assistant_response":
                conversation.append({"role": "assistant", "content": item.content})
        
        # Return the most recent n items, or all if n is None
        if n is not None:
            return conversation[-n:]
        return conversation
    
    def extract_relevant_context(self, query: str) -> List[Dict[str, Any]]:
        """
        Extract context items relevant to a user query.
        
        Args:
            query: User query to find relevant context for
            
        Returns:
            List of relevant context items
        """
        # TODO: Implement more sophisticated relevance detection
        # For now, just return the most recent items
        return self.history[-5:] 