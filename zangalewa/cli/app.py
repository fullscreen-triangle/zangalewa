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
import argparse
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
from zangalewa.cli.package_monitor import PackageMonitor, main as monitor_main
from zangalewa.cli.model_setup_cmd import models as models_cmd
from zangalewa.utils.model_setup import check_ollama_installed, check_ollama_running, get_installed_models

# Setup console for rich output
console = Console()

# Check if required models are available
def check_required_models() -> bool:
    """
    Check if the required models are available.
    Returns True if all required models are available, False otherwise.
    """
    # Skip check if running the models command
    if len(sys.argv) > 1 and (sys.argv[1] == "models" or sys.argv[1] == "--version" or sys.argv[1] == "-h" or sys.argv[1] == "--help"):
        return True

    if not check_ollama_installed():
        console.print("[red]ERROR: Ollama is not installed.[/red]")
        console.print("Zangalewa requires Ollama for local language models.")
        console.print("Please install Ollama from [link]https://ollama.ai[/link]")
        console.print("Then run [bold]zangalewa models setup --all[/bold] to install required models")
        return False
    
    if not check_ollama_running():
        console.print("[red]ERROR: Ollama service is not running.[/red]")
        console.print("Please start Ollama with [bold]ollama serve[/bold]")
        console.print("Then run [bold]zangalewa models setup --all[/bold] to install required models")
        return False
    
    installed_models = get_installed_models()
    required_models = {
        "mistral": "general interaction and orchestration",
        "codellama:7b-python": "Python code generation and analysis",
        "deepseek-coder:6.7b": "React and general code generation"
    }
    
    missing_models = []
    for model_name, purpose in required_models.items():
        if model_name not in installed_models:
            missing_models.append(f"{model_name} ({purpose})")
    
    if missing_models:
        console.print("[red]ERROR: Required models are missing:[/red]")
        for model in missing_models:
            console.print(f"  - [red]{model}[/red]")
        console.print("\nZangalewa requires these models to function.")
        console.print("Please run [bold]zangalewa models setup --all[/bold] to install all required models")
        return False
    
    return True

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
    },
    "monitor": {
        "callback": monitor_main,
        "help": "Monitor and run Python packages"
    },
    "models": {
        "callback": models_cmd,
        "help": "Set up and manage required language models"
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
        # Check if it's a monitor command
        if user_input.startswith("monitor ") or user_input == "monitor":
            # Extract the command and run the monitor
            parts = user_input.split(" ", 1)
            args = parts[1].split() if len(parts) > 1 else []
            
            # Create a package monitor
            monitor = PackageMonitor()
            
            if not args:
                # Show help if no arguments
                return "Usage: monitor [list|start|stop|run] [package names...]"
            
            cmd = args[0]
            
            if cmd == "list":
                # List packages
                packages = monitor.get_installed_packages()
                return f"Found {len(packages)} installed packages. Use 'monitor run [package]' to start monitoring."
                
            elif cmd == "start" and len(args) > 1:
                # Start package
                package = args[1]
                if monitor.start_package(package, args[2:] if len(args) > 2 else None):
                    return f"Started {package}. Use 'monitor watch {package}' to see output."
                else:
                    return f"Failed to start {package}."
                    
            elif cmd == "stop" and len(args) > 1:
                # Stop package
                package = args[1]
                if monitor.stop_package(package):
                    return f"Stopped {package}."
                else:
                    return f"Failed to stop {package}."
                    
            elif cmd == "run" and len(args) > 1:
                # Run and monitor packages
                packages = args[1:]
                started = []
                
                for package in packages:
                    if monitor.start_package(package):
                        started.append(package)
                        
                if started:
                    return f"Started {', '.join(started)}. Use 'monitor' to view status."
                else:
                    return "Failed to start any packages."
            
            return "Unknown monitor command. Try 'monitor list', 'monitor start [package]', 'monitor stop [package]', or 'monitor run [packages...]'"
        
        # Process with LLM
        system_prompt = """You are Zangalewa, an intelligent command-line assistant.
        Help the user with their query or command. Be concise and helpful."""
        
        messages = [{"role": "user", "content": user_input}]
        
        # Determine if this is a Python code or React code task
        task_type = "chat"
        if "python" in user_input.lower() or ".py" in user_input.lower():
            task_type = "python_code"
        elif "react" in user_input.lower() or "jsx" in user_input.lower() or "tsx" in user_input.lower():
            task_type = "react_code"
        
        try:
            response = await self.llm_manager.generate_response(
                messages=messages,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=2000,
                task_type=task_type
            )
            return response
        except Exception as e:
            return f"Error processing your request: {str(e)}"
    
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
    parser = argparse.ArgumentParser(description=f"Zangalewa CLI v{__version__}")
    
    # Add global arguments
    parser.add_argument("--version", action="store_true", help="Show version and exit")
    parser.add_argument("--interactive", "-i", action="store_true", help="Start interactive mode")
    
    # Create subparsers for commands
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # Error demo command
    error_demo_parser = subparsers.add_parser("error-demo", help="Demonstrate error handling")
    
    # Fix command
    fix_parser = subparsers.add_parser("fix", help="Run with automatic error fixing")
    fix_parser.add_argument("command", help="Command to run")
    fix_parser.add_argument("--project-dir", help="Project directory")
    fix_parser.add_argument("--no-git", action="store_true", help="Disable Git integration")
    
    # Fix script command
    fix_script_parser = subparsers.add_parser("fix-script", help="Run script with error fixing")
    fix_script_parser.add_argument("script_file", help="Script file path")
    fix_script_parser.add_argument("--project-dir", help="Project directory")
    fix_script_parser.add_argument("--no-git", action="store_true", help="Disable Git integration")
    fix_script_parser.add_argument("--continue-on-error", action="store_true", help="Continue on error")
    
    # Monitor command
    monitor_parser = subparsers.add_parser("monitor", help="Monitor Python packages")
    monitor_subparsers = monitor_parser.add_subparsers(dest="monitor_command", help="Monitor subcommand")
    
    # List packages subcommand
    list_parser = monitor_subparsers.add_parser("list", help="List installed packages")
    
    # Start package subcommand
    start_parser = monitor_subparsers.add_parser("start", help="Start a package")
    start_parser.add_argument("package", help="Package to start")
    start_parser.add_argument("args", nargs="*", help="Arguments for the package")
    
    # Stop package subcommand
    stop_parser = monitor_subparsers.add_parser("stop", help="Stop a package")
    stop_parser.add_argument("package", help="Package to stop")
    
    # Run packages subcommand
    run_parser = monitor_subparsers.add_parser("run", help="Run and monitor packages")
    run_parser.add_argument("packages", nargs="+", help="Packages to run")
    run_parser.add_argument("--refresh", type=int, default=2, help="Refresh interval (seconds)")
    
    # Watch package output subcommand
    watch_parser = monitor_subparsers.add_parser("watch", help="Watch package output")
    watch_parser.add_argument("package", help="Package to watch")
    
    # Models command
    models_parser = subparsers.add_parser("models", help="Set up and manage required language models")
    models_subparsers = models_parser.add_subparsers(dest="models_command", help="Models subcommand")
    
    # Status subcommand
    status_parser = models_subparsers.add_parser("status", help="Check status of required models")
    
    # Setup subcommand
    setup_parser = models_subparsers.add_parser("setup", help="Set up required models")
    setup_parser.add_argument("--all", action="store_true", help="Install all required models (recommended)")
    setup_parser.add_argument("--mistral", action="store_true", help="Install Mistral 7B model")
    setup_parser.add_argument("--codellama", action="store_true", help="Install CodeLlama 7B Python model")
    setup_parser.add_argument("--deepseek", action="store_true", help="Install DeepSeek Coder 6.7B model")
    setup_parser.add_argument("--wizard", action="store_true", help="Run the interactive setup wizard")
    
    # Parse the arguments
    parsed_args = parser.parse_args(args)
    
    # Handle version flag
    if parsed_args.version:
        print(f"Zangalewa v{__version__}")
        return (None, {})
    
    # Handle interactive mode
    if parsed_args.interactive:
        return ("interactive", {})
    
    # Handle no command
    if not parsed_args.command:
        parser.print_help()
        return (None, {})
    
    # Handle monitor command
    if parsed_args.command == "monitor":
        # Forward to the monitor module
        return ("monitor", {"args": args[1:]})
        
    # Handle models command
    if parsed_args.command == "models":
        # Forward to the models module
        return ("models", {"args": args[1:]})
    
    # Handle specific commands
    command = parsed_args.command
    command_args = vars(parsed_args)
    
    # Remove the command itself from the args
    if "command" in command_args:
        del command_args["command"]
        
    return (command, command_args)

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
    
    # Global logger
    global logger
    logger = logging.getLogger("zangalewa")
    
    # Parse command line arguments
    args = sys.argv[1:]
    command, parsed_args = parse_args(args)
    
    if not command:
        return 0  # Help was printed or version was shown
    
    # For models command, we always allow it to run
    if command != "models":
        # Check required models before running other commands
        if not check_required_models():
            return 1
    
    if command == "interactive":
        # Run the interactive TUI app
        try:
            app = ZangalewaApp()
            app.run()
        except Exception as e:
            logger.error(f"Error in interactive mode: {e}")
            return 1
    elif command == "monitor":
        # Run the monitor module directly
        monitor_args = parsed_args.get("args", [])
        sys.argv = [sys.argv[0]] + monitor_args
        monitor_main()
    elif command == "models":
        # Run the models module directly
        models_args = parsed_args.get("args", [])
        sys.argv = [sys.argv[0]] + models_args
        models_cmd()
    else:
        # Run the specific command
        asyncio.run(run_command(command, parsed_args))
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 