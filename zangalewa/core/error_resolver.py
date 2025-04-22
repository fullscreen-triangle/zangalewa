"""
Automatic error resolution functionality for Zangalewa.
"""

import logging
import subprocess
import os
import traceback
from typing import Dict, List, Optional, Tuple, Union

# Setup logging
logger = logging.getLogger(__name__)

class AutoErrorResolver:
    """
    Handles automatic error resolution with Git integration.
    """
    def __init__(self, project_dir: Optional[str] = None, git_enabled: bool = True):
        """
        Initialize the error resolver.
        
        Args:
            project_dir: Path to the project directory
            git_enabled: Whether to use Git for tracking changes
        """
        self.project_dir = project_dir or os.getcwd()
        self.git_enabled = git_enabled
        self.error_fixes_count = 0
        
        # Error types that can be automatically resolved
        self.supported_error_types = [
            "ModuleNotFoundError",
            "ImportError",
            "SyntaxError",
            "IndentationError",
            "NameError",
            "AttributeError"
        ]
        
        logger.info(f"AutoErrorResolver initialized. Git integration: {git_enabled}")
        
    def resolve_error(self, error: Exception) -> bool:
        """
        Attempts to automatically resolve an error.
        
        Args:
            error: The exception to resolve
            
        Returns:
            True if resolved successfully, False otherwise
        """
        error_type = type(error).__name__
        error_msg = str(error)
        
        logger.info(f"Attempting to resolve {error_type}: {error_msg}")
        
        # Check if the error type is supported
        if error_type not in self.supported_error_types:
            logger.warning(f"Error type {error_type} is not supported for automatic resolution")
            return False
        
        # Get the full traceback
        tb = traceback.extract_tb(error.__traceback__)
        
        # Create a branch for the fix if Git is enabled
        if self.git_enabled:
            branch_name = self._create_fix_branch(error_type)
            if not branch_name:
                logger.warning("Failed to create Git branch for the fix")
        
        # Resolve the error based on its type
        resolved = False
        
        if error_type == "ModuleNotFoundError" or error_type == "ImportError":
            resolved = self._resolve_import_error(error_msg, tb)
        elif error_type == "SyntaxError" or error_type == "IndentationError":
            resolved = self._resolve_syntax_error(error_msg, tb)
        elif error_type == "NameError":
            resolved = self._resolve_name_error(error_msg, tb)
        elif error_type == "AttributeError":
            resolved = self._resolve_attribute_error(error_msg, tb)
        
        # Commit the changes if the error was resolved and Git is enabled
        if resolved and self.git_enabled:
            self._commit_fix(error_type, error_msg)
            self.error_fixes_count += 1
        
        return resolved
        
    def _create_fix_branch(self, error_type: str) -> Optional[str]:
        """
        Create a Git branch for the fix.
        
        Args:
            error_type: Type of the error
            
        Returns:
            Branch name if successful, None otherwise
        """
        branch_name = f"auto-fix-{error_type.lower()}-{self.error_fixes_count}"
        
        try:
            # Check if Git is initialized
            subprocess.run(
                ["git", "rev-parse", "--is-inside-work-tree"],
                cwd=self.project_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Create and checkout a new branch
            subprocess.run(
                ["git", "checkout", "-b", branch_name],
                cwd=self.project_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            logger.info(f"Created Git branch: {branch_name}")
            return branch_name
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git error: {e}")
            return None
    
    def _commit_fix(self, error_type: str, error_msg: str) -> bool:
        """
        Commit the fix to the Git repository.
        
        Args:
            error_type: Type of the error
            error_msg: Error message
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Add all changes
            subprocess.run(
                ["git", "add", "."],
                cwd=self.project_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Commit with a descriptive message
            commit_message = f"Auto-fix: {error_type} - {error_msg[:50]}"
            if len(error_msg) > 50:
                commit_message += "..."
                
            subprocess.run(
                ["git", "commit", "-m", commit_message],
                cwd=self.project_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            logger.info(f"Committed fix: {commit_message}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git error: {e}")
            return False
    
    def _resolve_import_error(self, error_msg: str, traceback: List) -> bool:
        """
        Resolve ModuleNotFoundError or ImportError.
        
        Args:
            error_msg: Error message
            traceback: Traceback information
            
        Returns:
            True if resolved, False otherwise
        """
        # This is a placeholder implementation
        # In a real implementation, it would:
        # 1. Extract the module name from the error
        # 2. Try to install it using pip
        # 3. Update the requirements.txt file
        
        logger.info("Placeholder for import error resolution")
        logger.info(f"Would attempt to install missing module from error: {error_msg}")
        
        # Return False since this is just a placeholder
        return False
    
    def _resolve_syntax_error(self, error_msg: str, traceback: List) -> bool:
        """
        Resolve SyntaxError or IndentationError.
        
        Args:
            error_msg: Error message
            traceback: Traceback information
            
        Returns:
            True if resolved, False otherwise
        """
        # This is a placeholder implementation
        # In a real implementation, it would:
        # 1. Identify the file and line with the error
        # 2. Parse the error details
        # 3. Apply common syntax fixes (missing parens, quotes, colons, etc.)
        
        logger.info("Placeholder for syntax error resolution")
        
        # Return False since this is just a placeholder
        return False
    
    def _resolve_name_error(self, error_msg: str, traceback: List) -> bool:
        """
        Resolve NameError.
        
        Args:
            error_msg: Error message
            traceback: Traceback information
            
        Returns:
            True if resolved, False otherwise
        """
        # This is a placeholder implementation
        
        logger.info("Placeholder for name error resolution")
        
        # Return False since this is just a placeholder
        return False
    
    def _resolve_attribute_error(self, error_msg: str, traceback: List) -> bool:
        """
        Resolve AttributeError.
        
        Args:
            error_msg: Error message
            traceback: Traceback information
            
        Returns:
            True if resolved, False otherwise
        """
        # This is a placeholder implementation
        
        logger.info("Placeholder for attribute error resolution")
        
        # Return False since this is just a placeholder
        return False 