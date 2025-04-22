#!/usr/bin/env python3
"""
Smart CLI Assistant Example

This example demonstrates how to use Zangalewa as a smart CLI assistant
for various development tasks, including bioinformatics operations.
"""

import os
import sys
import argparse
import time
import subprocess
from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax
from rich.table import Table
from rich.prompt import Prompt
from rich.progress import Progress

# Add parent directory to path to import Zangalewa
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from zangalewa.core.assistant import ZangalewaAssistant
from zangalewa.core.error_resolver import AutoErrorResolver

# Initialize console for rich output
console = Console()

class SmartCLIExample:
    """Example class demonstrating Zangalewa's smart CLI assistant capabilities."""
    
    def __init__(self):
        """Initialize the example."""
        self.assistant = ZangalewaAssistant()
        self.error_resolver = AutoErrorResolver(git_enabled=False)
        self.working_dir = os.getcwd()
    
    def run_interactive_mode(self):
        """Run the CLI assistant in interactive mode."""
        console.print(Panel("Zangalewa Smart CLI Assistant", 
                           subtitle="Type 'exit' or 'quit' to exit",
                           style="green"))
        
        while True:
            user_input = Prompt.ask("[bold blue]>>[/bold blue]")
            
            if user_input.lower() in ['exit', 'quit']:
                console.print("[green]Exiting smart CLI assistant[/green]")
                break
            
            # Process the command or query
            self.process_input(user_input)
    
    def process_input(self, user_input):
        """Process user input and determine appropriate action."""
        # Check if it's a system command (starts with !)
        if user_input.startswith('!'):
            self.run_system_command(user_input[1:])
            return
        
        # Check for special commands
        if user_input.startswith('analyze '):
            filename = user_input[8:].strip()
            self.analyze_file(filename)
            return
        
        if user_input.startswith('fasta '):
            filename = user_input[6:].strip()
            self.analyze_fasta(filename)
            return
        
        if user_input.startswith('git '):
            git_command = user_input[4:].strip()
            self.run_git_command(git_command)
            return
            
        if user_input.startswith('monitor '):
            monitor_command = user_input[8:].strip()
            self.monitor_package(monitor_command)
            return
        
        # Process as a natural language query to the assistant
        try:
            with Progress() as progress:
                task = progress.add_task("[cyan]Processing query...", total=100)
                
                # Simulate LLM processing
                for i in range(100):
                    time.sleep(0.01)  # Simulating processing time
                    progress.update(task, completed=i+1)
                
            result = self.assistant.process_query(user_input)
            console.print(Panel(result.response, title="Assistant Response", border_style="green"))
            
        except Exception as e:
            console.print(f"[red]Error processing query: {e}[/red]")
            resolved = self.error_resolver.resolve_error(e)
            
            if resolved:
                console.print("[green]Error was automatically resolved![/green]")
                # Try again
                result = self.assistant.process_query(user_input)
                console.print(Panel(result.response, title="Assistant Response", border_style="green"))
    
    def run_system_command(self, command):
        """Run a system command and display the output."""
        console.print(f"[blue]Running: {command}[/blue]")
        
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True,
                text=True,
                cwd=self.working_dir
            )
            
            if result.returncode == 0:
                if result.stdout:
                    console.print(Panel(result.stdout, title="Command Output", border_style="green"))
                else:
                    console.print("[green]Command executed successfully (no output)[/green]")
            else:
                console.print(Panel(result.stderr, title="Error", border_style="red"))
                
                # Try to auto-resolve common errors
                if "command not found" in result.stderr:
                    self.suggest_package_install(command.split()[0])
                
        except Exception as e:
            console.print(f"[red]Error executing command: {e}[/red]")
    
    def suggest_package_install(self, command):
        """Suggest package to install for missing command."""
        common_packages = {
            "python": "python3",
            "pip": "python3-pip",
            "node": "nodejs",
            "npm": "npm",
            "java": "default-jdk",
            "gcc": "build-essential",
            "make": "build-essential",
            "git": "git",
            "curl": "curl",
            "wget": "wget",
            "docker": "docker.io",
            "samtools": "samtools",
            "blast": "ncbi-blast+",
            "bowtie": "bowtie2",
            "bwa": "bwa",
            "fastqc": "fastqc"
        }
        
        if command in common_packages:
            console.print(f"[yellow]Suggestion: The '{command}' command was not found.[/yellow]")
            console.print(f"[yellow]You might need to install it using:[/yellow]")
            
            # Determine OS and suggest appropriate command
            if os.name == 'posix':
                if os.path.exists('/etc/debian_version'):
                    console.print(f"[green]sudo apt-get install {common_packages[command]}[/green]")
                elif os.path.exists('/etc/redhat-release'):
                    console.print(f"[green]sudo yum install {common_packages[command]}[/green]")
                elif os.path.exists('/etc/arch-release'):
                    console.print(f"[green]sudo pacman -S {common_packages[command]}[/green]")
                elif os.path.exists('/usr/local/bin/brew'):
                    console.print(f"[green]brew install {common_packages[command]}[/green]")
                else:
                    console.print("[green]Please install using your system's package manager[/green]")
            elif os.name == 'nt':
                console.print(f"[green]Consider installing {command} for Windows[/green]")
    
    def analyze_file(self, filename):
        """Analyze a file and provide information about it."""
        if not os.path.exists(filename):
            console.print(f"[red]File not found: {filename}[/red]")
            return
        
        # Get file info
        file_size = os.path.getsize(filename)
        file_ext = os.path.splitext(filename)[1]
        
        # Create a file info table
        table = Table(title=f"File Analysis: {filename}")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("File size", f"{file_size} bytes")
        table.add_row("File extension", file_ext or "None")
        
        # Different analysis based on file type
        if file_ext.lower() in ['.py', '.js', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs']:
            # Code file
            self.analyze_code_file(filename, table)
        elif file_ext.lower() in ['.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn']:
            # FASTA file
            self.analyze_fasta_file(filename, table)
        elif file_ext.lower() in ['.json', '.yaml', '.yml', '.xml', '.toml']:
            # Config file
            table.add_row("File type", "Configuration file")
            with open(filename, 'r') as f:
                try:
                    content = f.read(1000)  # Read first 1000 chars
                    syntax = Syntax(content, file_ext.lstrip('.'), theme="monokai", line_numbers=True)
                    console.print(table)
                    console.print(syntax)
                except Exception as e:
                    table.add_row("Error", str(e))
                    console.print(table)
        else:
            # Generic file
            table.add_row("File type", "Unknown/binary")
            console.print(table)
    
    def analyze_code_file(self, filename, table=None):
        """Analyze a code file."""
        if table is None:
            table = Table(title=f"Code Analysis: {filename}")
            table.add_column("Property", style="cyan")
            table.add_column("Value", style="green")
        
        # Count lines of code
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            total_lines = len(lines)
            code_lines = len([l for l in lines if l.strip() and not l.strip().startswith('#')])
            comment_lines = len([l for l in lines if l.strip().startswith('#')])
            blank_lines = total_lines - code_lines - comment_lines
            
            table.add_row("File type", "Code file")
            table.add_row("Total lines", str(total_lines))
            table.add_row("Code lines", str(code_lines))
            table.add_row("Comment lines", str(comment_lines))
            table.add_row("Blank lines", str(blank_lines))
            
            # Display the first 20 lines
            with open(filename, 'r') as f:
                content = ''.join(lines[:20])
                
            console.print(table)
            syntax = Syntax(content, os.path.splitext(filename)[1].lstrip('.'), theme="monokai", line_numbers=True)
            console.print(syntax)
            
        except Exception as e:
            table.add_row("Error", str(e))
            console.print(table)
    
    def analyze_fasta_file(self, filename, table=None):
        """Analyze a FASTA file."""
        if table is None:
            table = Table(title=f"FASTA Analysis: {filename}")
            table.add_column("Property", style="cyan")
            table.add_column("Value", style="green")
        
        try:
            sequences = 0
            total_length = 0
            min_length = float('inf')
            max_length = 0
            
            with open(filename, 'r') as f:
                current_seq = ""
                for line in f:
                    line = line.strip()
                    if line.startswith('>'):
                        if current_seq:
                            seq_len = len(current_seq)
                            total_length += seq_len
                            min_length = min(min_length, seq_len)
                            max_length = max(max_length, seq_len)
                            current_seq = ""
                        sequences += 1
                    else:
                        current_seq += line
                
                # Don't forget the last sequence
                if current_seq:
                    seq_len = len(current_seq)
                    total_length += seq_len
                    min_length = min(min_length, seq_len)
                    max_length = max(max_length, seq_len)
            
            # Add stats to table
            table.add_row("File type", "FASTA file")
            table.add_row("Number of sequences", str(sequences))
            table.add_row("Total sequence length", str(total_length))
            table.add_row("Average sequence length", f"{total_length/sequences:.2f}" if sequences > 0 else "N/A")
            table.add_row("Minimum sequence length", str(min_length) if min_length != float('inf') else "N/A")
            table.add_row("Maximum sequence length", str(max_length))
            
            console.print(table)
            
        except Exception as e:
            table.add_row("Error", str(e))
            console.print(table)
    
    def analyze_fasta(self, filename):
        """Analyze a FASTA file with more detailed information."""
        if not os.path.exists(filename):
            console.print(f"[red]File not found: {filename}[/red]")
            return
        
        console.print(Panel(f"Analyzing FASTA file: {filename}", style="cyan"))
        
        try:
            self.analyze_fasta_file(filename)
            
            # Perform advanced analysis using the assistant
            query = f"Analyze the FASTA file {filename} and give me insights about the sequences"
            
            with Progress() as progress:
                task = progress.add_task("[cyan]Processing FASTA file...", total=100)
                
                # Simulate processing
                for i in range(100):
                    time.sleep(0.01)
                    progress.update(task, completed=i+1)
            
            result = self.assistant.process_query(query)
            console.print(Panel(result.response, title="FASTA Analysis", border_style="green"))
            
        except Exception as e:
            console.print(f"[red]Error analyzing FASTA file: {e}[/red]")
    
    def run_git_command(self, git_command):
        """Run a git command with additional features."""
        try:
            # First, check if we're in a git repository
            check_git = subprocess.run(
                "git rev-parse --is-inside-work-tree",
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.working_dir
            )
            
            if check_git.returncode != 0:
                console.print("[red]Not in a git repository[/red]")
                return
            
            # Special git commands
            if git_command == "smart-commit":
                # Generate commit message based on changes
                console.print("[blue]Generating smart commit message...[/blue]")
                
                # Get diff
                diff = subprocess.run(
                    "git diff --staged",
                    shell=True,
                    capture_output=True,
                    text=True,
                    cwd=self.working_dir
                )
                
                if not diff.stdout:
                    console.print("[yellow]No staged changes. Stage changes first with 'git add'[/yellow]")
                    return
                
                # Use the assistant to generate a commit message
                with Progress() as progress:
                    task = progress.add_task("[cyan]Analyzing changes...", total=100)
                    for i in range(100):
                        time.sleep(0.01)
                        progress.update(task, completed=i+1)
                
                query = f"Generate a concise git commit message based on these changes:\n\n{diff.stdout[:1000]}"
                result = self.assistant.process_query(query)
                
                commit_msg = result.response.strip()
                console.print(Panel(commit_msg, title="Generated Commit Message", border_style="green"))
                
                # Ask user if they want to use this message
                use_msg = Prompt.ask("[blue]Use this commit message?[/blue]", choices=["y", "n"], default="y")
                
                if use_msg.lower() == "y":
                    # Run git commit with the message
                    commit = subprocess.run(
                        f'git commit -m "{commit_msg}"',
                        shell=True,
                        capture_output=True,
                        text=True,
                        cwd=self.working_dir
                    )
                    
                    if commit.returncode == 0:
                        console.print("[green]Changes committed successfully[/green]")
                    else:
                        console.print(f"[red]Error committing changes: {commit.stderr}[/red]")
                else:
                    console.print("[yellow]Commit cancelled[/yellow]")
                
                return
            
            # Normal git command
            result = subprocess.run(
                f"git {git_command}",
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.working_dir
            )
            
            if result.returncode == 0:
                if result.stdout:
                    console.print(Panel(result.stdout, title=f"Git {git_command}", border_style="green"))
                else:
                    console.print(f"[green]Git command 'git {git_command}' executed successfully[/green]")
            else:
                console.print(Panel(result.stderr, title="Git Error", border_style="red"))
                
        except Exception as e:
            console.print(f"[red]Error executing git command: {e}[/red]")
    
    def monitor_package(self, command):
        """Monitor a package using the package monitor."""
        from zangalewa.cli.package_monitor import PackageMonitor
        
        parts = command.split()
        if not parts:
            console.print("[yellow]Usage: monitor [list|start|stop|run] [package names...][/yellow]")
            return
        
        cmd = parts[0]
        monitor = PackageMonitor()
        
        if cmd == "list":
            # List packages
            packages = monitor.get_installed_packages()
            
            table = Table(title="Installed Python Packages")
            table.add_column("Package Name", style="cyan")
            table.add_column("Status", style="green")
            
            for package in sorted(packages[:50]):  # Limit to first 50 packages
                status = "Available"
                if package in monitor.processes:
                    status = "Running" if monitor.processes[package].poll() is None else "Stopped"
                    
                status_style = "green" if status == "Running" else "yellow" if status == "Available" else "red"
                table.add_row(package, f"[{status_style}]{status}[/{status_style}]")
                
            console.print(table)
            console.print(f"[cyan]Showing first 50 of {len(packages)} packages[/cyan]")
            
        elif cmd == "start" and len(parts) > 1:
            # Start package
            package = parts[1]
            args = parts[2:] if len(parts) > 2 else None
            
            if monitor.start_package(package, args):
                console.print(f"[green]Package {package} started[/green]")
            else:
                console.print(f"[red]Failed to start package {package}[/red]")
                
        elif cmd == "stop" and len(parts) > 1:
            # Stop package
            package = parts[1]
            
            if monitor.stop_package(package):
                console.print(f"[green]Package {package} stopped[/green]")
            else:
                console.print(f"[red]Failed to stop package {package}[/red]")
                
        elif cmd == "run" and len(parts) > 1:
            # Run and monitor packages
            packages = parts[1:]
            started = []
            
            for package in packages:
                if monitor.start_package(package):
                    started.append(package)
                    
            if started:
                console.print(f"[green]Started: {', '.join(started)}[/green]")
                
                # Monitor for a while
                console.print("[yellow]Press Ctrl+C to stop monitoring[/yellow]")
                try:
                    for _ in range(10):  # Monitor for 10 updates
                        monitor.update_stats()
                        monitor.display_stats()
                        time.sleep(2)
                except KeyboardInterrupt:
                    console.print("[yellow]Stopping monitor...[/yellow]")
                    
                # Ask if user wants to stop the packages
                stop_pkgs = Prompt.ask("[blue]Stop the packages?[/blue]", choices=["y", "n"], default="y")
                
                if stop_pkgs.lower() == "y":
                    for package in started:
                        monitor.stop_package(package)
                    console.print("[green]All packages stopped[/green]")
            else:
                console.print("[red]Failed to start any packages[/red]")
        else:
            console.print("[yellow]Usage: monitor [list|start|stop|run] [package names...][/yellow]")

def main():
    """Main entry point for the example."""
    parser = argparse.ArgumentParser(
        description="Zangalewa Smart CLI Assistant Example"
    )
    
    parser.add_argument("--command", "-c", help="Run a single command")
    parser.add_argument("--analyze", "-a", help="Analyze a file")
    parser.add_argument("--fasta", "-f", help="Analyze a FASTA file")
    parser.add_argument("--git", "-g", help="Run a git command")
    
    args = parser.parse_args()
    
    example = SmartCLIExample()
    
    if args.command:
        example.process_input(args.command)
    elif args.analyze:
        example.analyze_file(args.analyze)
    elif args.fasta:
        example.analyze_fasta(args.fasta)
    elif args.git:
        example.run_git_command(args.git)
    else:
        example.run_interactive_mode()

if __name__ == "__main__":
    main() 