"""
Auto-fix command handler for automatically resolving errors without user intervention.
"""

import logging
import os
import time
import asyncio
from typing import Dict, Any, Optional, List

from zangalewa.core.errors.auto_resolver import AutoErrorResolver, ErrorFixResult
from zangalewa.core.executor import CommandExecutor
from zangalewa.core.llm import LLMManager
from zangalewa.cli.ui.error_display import ErrorDisplay
from zangalewa.utils.config import get_config

logger = logging.getLogger(__name__)

class AutoFixCommandHandler:
    """Command handler for automatic error fixing."""
    
    def __init__(
        self,
        llm_manager: LLMManager,
        command_executor: Optional[CommandExecutor] = None,
        project_dir: str = ".",
        git_enabled: bool = True
    ):
        """
        Initialize the auto-fix command handler.
        
        Args:
            llm_manager: LLM manager for generating solutions
            command_executor: Command executor for testing solutions
            project_dir: Project directory to operate in
            git_enabled: Whether to use git to track changes
        """
        self.llm_manager = llm_manager
        self.command_executor = command_executor or CommandExecutor()
        self.project_dir = os.path.abspath(project_dir)
        self.git_enabled = git_enabled
        
        # Initialize the auto resolver
        self.auto_resolver = AutoErrorResolver(
            llm_manager=llm_manager,
            command_executor=self.command_executor,
            git_enabled=git_enabled,
            project_dir=project_dir
        )
        
        # Initialize the error display
        self.error_display = ErrorDisplay()
        
    async def run_with_auto_fix(self, command: str, max_fix_attempts: int = 3) -> bool:
        """
        Run a command with automatic error fixing.
        
        Args:
            command: The command to run
            max_fix_attempts: Maximum number of automatic fix attempts
            
        Returns:
            Whether the command succeeded eventually
        """
        self.error_display.console.print(f"[bold]Running command:[/bold] {command}")
        
        # Run the command
        result = await self.command_executor.execute(command)
        
        # Check if the command succeeded
        if result.success:
            self.error_display.console.print("[bold green]Command succeeded![/bold green]")
            return True
            
        # Command failed, try to fix the error
        fix_attempts = 0
        while not result.success and fix_attempts < max_fix_attempts:
            fix_attempts += 1
            
            self.error_display.console.print(
                f"[bold yellow]Command failed (attempt {fix_attempts}/{max_fix_attempts}), trying to auto-fix...[/bold yellow]"
            )
            
            # Try to fix the error
            fix_result = await self.auto_resolver.handle_error(
                command=command,
                return_code=result.return_code,
                error_text=result.error
            )
            
            # Display the fix result
            self._display_fix_result(fix_result)
            
            # If the fix was successful, try running the command again
            if fix_result.success:
                self.error_display.console.print(f"[bold]Retrying command:[/bold] {command}")
                result = await self.command_executor.execute(command)
                
                if result.success:
                    self.error_display.console.print("[bold green]Command succeeded after auto-fix![/bold green]")
                    return True
            else:
                # If fix failed and we've reached the max attempts, break out
                if fix_attempts >= max_fix_attempts:
                    break
                    
                # Wait a moment before the next fix attempt
                await asyncio.sleep(1)
                
        # Command still failed after fix attempts
        if not result.success:
            self.error_display.console.print("[bold red]Auto-fix failed, command still failing.[/bold red]")
            
            # Display the error for human intervention
            self.error_display.display_quick_error(
                error_text=result.error,
                description="Command failed after auto-fix attempts"
            )
            
        return result.success
        
    def _display_fix_result(self, fix_result: ErrorFixResult) -> None:
        """Display the result of an auto-fix attempt."""
        if fix_result.success:
            self.error_display.console.print("[bold green]Auto-fix successful![/bold green]")
            self.error_display.console.print(f"Fix: {fix_result.fix_description}")
            
            if fix_result.commit_hash:
                self.error_display.console.print(f"Changes committed: {fix_result.commit_hash}")
                
            if fix_result.modified_files:
                self.error_display.console.print("[bold]Modified files:[/bold]")
                for file in fix_result.modified_files:
                    self.error_display.console.print(f" - {file}")
                    
            if fix_result.fix_command:
                self.error_display.console.print(f"Fix command: {fix_result.fix_command}")
        else:
            self.error_display.console.print("[bold red]Auto-fix failed.[/bold red]")
            self.error_display.console.print(f"Reason: {fix_result.fix_description}")
            
    async def run_all_commands(self, commands: List[str], continue_on_error: bool = False) -> Dict[str, bool]:
        """
        Run multiple commands with automatic error fixing.
        
        Args:
            commands: List of commands to run
            continue_on_error: Whether to continue running commands if one fails
            
        Returns:
            Dictionary of command results
        """
        results = {}
        
        for i, command in enumerate(commands):
            self.error_display.console.print()
            self.error_display.console.print(f"[bold]Running command {i+1}/{len(commands)}:[/bold]")
            
            success = await self.run_with_auto_fix(command)
            results[command] = success
            
            if not success and not continue_on_error:
                self.error_display.console.print(
                    "[bold red]Stopping execution due to failed command.[/bold red]"
                )
                break
                
        # Display summary
        self.error_display.console.print()
        self.error_display.console.print("[bold]Execution Summary:[/bold]")
        
        success_count = sum(1 for success in results.values() if success)
        self.error_display.console.print(
            f"Commands: {len(results)}, Succeeded: {success_count}, Failed: {len(results) - success_count}"
        )
        
        return results
        
async def command_auto_fix(args: Dict[str, Any]) -> None:
    """
    Run a command with automatic error fixing.
    
    Args:
        args: Command arguments containing:
            - command: The command to run
            - project_dir: Project directory (optional)
            - git_enabled: Whether to use git (optional)
    """
    # Get configuration
    config = get_config()
    
    # Initialize LLM manager
    llm_manager = LLMManager()
    
    # Get command arguments
    command = args.get("command", "")
    project_dir = args.get("project_dir", ".")
    git_enabled = args.get("git_enabled", True)
    
    if not command:
        print("Error: No command specified")
        return
        
    # Create command handler
    handler = AutoFixCommandHandler(
        llm_manager=llm_manager,
        project_dir=project_dir,
        git_enabled=git_enabled
    )
    
    # Run the command with auto-fix
    await handler.run_with_auto_fix(command)
    
async def command_auto_fix_script(args: Dict[str, Any]) -> None:
    """
    Run a script file with automatic error fixing for each command.
    
    Args:
        args: Command arguments containing:
            - script_file: Path to the script file
            - project_dir: Project directory (optional)
            - git_enabled: Whether to use git (optional)
            - continue_on_error: Whether to continue on error (optional)
    """
    # Get configuration
    config = get_config()
    
    # Initialize LLM manager
    llm_manager = LLMManager()
    
    # Get command arguments
    script_file = args.get("script_file", "")
    project_dir = args.get("project_dir", ".")
    git_enabled = args.get("git_enabled", True)
    continue_on_error = args.get("continue_on_error", False)
    
    if not script_file or not os.path.exists(script_file):
        print(f"Error: Script file not found: {script_file}")
        return
        
    # Read commands from the script file
    try:
        with open(script_file, 'r') as file:
            commands = [line.strip() for line in file if line.strip() and not line.strip().startswith('#')]
    except Exception as e:
        print(f"Error reading script file: {e}")
        return
        
    if not commands:
        print("No commands found in the script file")
        return
        
    # Create command handler
    handler = AutoFixCommandHandler(
        llm_manager=llm_manager,
        project_dir=project_dir,
        git_enabled=git_enabled
    )
    
    # Run all commands
    await handler.run_all_commands(commands, continue_on_error) 