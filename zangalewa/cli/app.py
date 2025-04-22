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
    },
    "monitor": {
        "callback": monitor_main,
        "help": "Monitor and run Python packages"
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
        
        # TODO: Implement AI processing for other commands
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
    else:
        # Run the specific command
        asyncio.run(run_command(command, parsed_args))
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 