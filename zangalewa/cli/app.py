#!/usr/bin/env python3
"""
Main entry point for the Zangalewa CLI application.
"""

import os
import sys
import asyncio
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Input
from textual.containers import Container
import logging
from typing import List, Dict, Any

from zangalewa import __version__
from zangalewa.cli.ui.styles import STYLES
from zangalewa.core.llm import LLMManager
from zangalewa.core.executor import CommandExecutor
from zangalewa.meta.context import ContextManager
from zangalewa.utils.config import load_config
from zangalewa.utils.logging import setup_logging
from zangalewa.cli.commands.error_cmd import command_error_demo
from zangalewa.cli.commands.auto_fix_cmd import command_auto_fix, command_auto_fix_script

# Setup console for rich output
console = Console()

# Command registry
COMMANDS = {
    "error-demo": {
        "callback": command_error_demo,
        "help": "Demonstrate error handling capabilities"
    },
    "fix": {
        "callback": command_auto_fix,
        "help": "Run a command with automatic error fixing"
    },
    "fix-script": {
        "callback": command_auto_fix_script,
        "help": "Run a script file with automatic error fixing for each command"
    }
}

class ZangalewaApp(App):
    """Main Zangalewa TUI Application."""
    
    TITLE = "Zangalewa CLI"
    SUB_TITLE = f"v{__version__}"
    CSS = STYLES
    
    def __init__(self):
        """Initialize the Zangalewa application."""
        super().__init__()
        self.context_manager = ContextManager()
        self.llm_manager = LLMManager()
        self.command_executor = CommandExecutor()
        self.conversation_history = []
        
    def compose(self) -> ComposeResult:
        """Create child widgets for the app."""
        yield Header()
        yield Container(
            Input(placeholder="Enter a command or ask a question...", id="user_input"),
            id="main_container"
        )
        yield Footer()
        
    async def on_input_submitted(self, event):
        """Handle user input."""
        user_input = event.value
        
        # Clear the input field
        input_widget = self.query_one("#user_input")
        input_widget.value = ""
        
        # Add user input to conversation history
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # Update context with user input
        self.context_manager.update(user_input)
        
        # Process the input
        if user_input.lower() in ["exit", "quit"]:
            self.exit()
        else:
            # Process with AI or execute as command
            result = await self._process_input(user_input)
            
            # Add response to history
            self.conversation_history.append({"role": "assistant", "content": result})
            
            # Display result
            self._display_result(result)
    
    async def _process_input(self, user_input):
        """Process user input with AI or as a direct command."""
        # TODO: Implement AI processing and command execution
        return f"Received: {user_input}"
    
    def _display_result(self, result):
        """Display the result in the UI."""
        # TODO: Implement rich text display of results
        console.print(Panel(Text(result)))

async def run_command(command: str, args: Dict[str, Any]) -> None:
    """
    Run a CLI command.
    
    Args:
        command: Command name
        args: Command arguments
    """
    if command in COMMANDS:
        try:
            await COMMANDS[command]["callback"](args)
        except Exception as e:
            logger.error(f"Error executing command '{command}': {e}")
            print(f"Error: {e}")
    else:
        print(f"Unknown command: {command}")
        print("Available commands:")
        for cmd, details in COMMANDS.items():
            print(f"  {cmd}: {details['help']}")

def parse_args(args: List[str]) -> tuple:
    """
    Parse command line arguments.
    
    Args:
        args: Command line arguments
        
    Returns:
        Tuple of (command, arguments)
    """
    if not args:
        return (None, {})
        
    command = args[0]
    parsed_args = {}
    
    # Parse command-specific arguments
    if command == "fix":
        if len(args) < 2:
            print("Error: Missing command to run")
            return (None, {})
            
        parsed_args["command"] = args[1]
        
        # Parse optional arguments
        for i in range(2, len(args)):
            if args[i] == "--project-dir" and i + 1 < len(args):
                parsed_args["project_dir"] = args[i + 1]
            elif args[i] == "--no-git":
                parsed_args["git_enabled"] = False
                
    elif command == "fix-script":
        if len(args) < 2:
            print("Error: Missing script file path")
            return (None, {})
            
        parsed_args["script_file"] = args[1]
        
        # Parse optional arguments
        for i in range(2, len(args)):
            if args[i] == "--project-dir" and i + 1 < len(args):
                parsed_args["project_dir"] = args[i + 1]
            elif args[i] == "--no-git":
                parsed_args["git_enabled"] = False
            elif args[i] == "--continue-on-error":
                parsed_args["continue_on_error"] = True
    
    return (command, parsed_args)

def main() -> int:
    """
    Main entry point for the CLI application.
    
    Returns:
        Exit code
    """
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Parse command line arguments
    args = sys.argv[1:]
    command, parsed_args = parse_args(args)
    
    if not command:
        print("Usage: zangalewa <command> [options]")
        print("Available commands:")
        for cmd, details in COMMANDS.items():
            print(f"  {cmd}: {details['help']}")
        return 1
        
    # Run the command
    asyncio.run(run_command(command, parsed_args))
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 