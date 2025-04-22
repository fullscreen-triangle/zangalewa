#!/usr/bin/env python3
"""
Package Monitor CLI Tool

A utility for running and monitoring Python packages installed on your system.
"""

import os
import sys
import time
import subprocess
import argparse
import logging
import importlib
import pkgutil
import psutil
from typing import List, Dict, Any, Optional, Tuple
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.live import Live

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("package_monitor")

# Rich console for pretty output
console = Console()

class PackageMonitor:
    """Monitors Python packages and their processes."""
    
    def __init__(self, packages: List[str] = None):
        """
        Initialize the package monitor.
        
        Args:
            packages: List of package names to monitor
        """
        self.packages = packages or []
        self.processes: Dict[str, subprocess.Popen] = {}
        self.stats: Dict[str, Dict[str, Any]] = {}
        
    def get_installed_packages(self) -> List[str]:
        """
        Get a list of all installed Python packages.
        
        Returns:
            List of package names
        """
        return [pkg.name for pkg in pkgutil.iter_modules()]
        
    def check_package(self, package_name: str) -> bool:
        """
        Check if a package is installed.
        
        Args:
            package_name: Name of the package to check
            
        Returns:
            True if the package is installed, False otherwise
        """
        try:
            importlib.import_module(package_name)
            return True
        except ImportError:
            return False
    
    def start_package(self, package_name: str, args: List[str] = None) -> bool:
        """
        Start a package as a process.
        
        Args:
            package_name: Name of the package to start
            args: Command line arguments to pass to the package
            
        Returns:
            True if the package was started successfully, False otherwise
        """
        if package_name in self.processes and self.processes[package_name].poll() is None:
            logger.warning(f"Package {package_name} is already running")
            return False
            
        try:
            # Try to find the entry point script
            # First, check if package has a console_scripts entry point
            cmd = [sys.executable, "-m", package_name]
            if args:
                cmd.extend(args)
                
            logger.info(f"Starting {package_name} with command: {' '.join(cmd)}")
            
            # Start the process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            self.processes[package_name] = process
            self.stats[package_name] = {
                "start_time": time.time(),
                "last_check": time.time(),
                "memory_usage": 0,
                "cpu_usage": 0,
                "status": "running"
            }
            
            logger.info(f"Started {package_name} (PID: {process.pid})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start {package_name}: {e}")
            return False
    
    def stop_package(self, package_name: str) -> bool:
        """
        Stop a running package.
        
        Args:
            package_name: Name of the package to stop
            
        Returns:
            True if the package was stopped successfully, False otherwise
        """
        if package_name not in self.processes:
            logger.warning(f"Package {package_name} is not running")
            return False
            
        process = self.processes[package_name]
        
        if process.poll() is not None:
            logger.info(f"Package {package_name} is already stopped")
            return True
            
        try:
            # Try to terminate gracefully first
            process.terminate()
            
            # Wait up to 5 seconds for the process to terminate
            for _ in range(5):
                if process.poll() is not None:
                    break
                time.sleep(1)
                
            # If still running, kill it
            if process.poll() is None:
                process.kill()
                process.wait()
                
            logger.info(f"Stopped {package_name}")
            
            if package_name in self.stats:
                self.stats[package_name]["status"] = "stopped"
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop {package_name}: {e}")
            return False
    
    def update_stats(self) -> None:
        """Update statistics for all running packages."""
        for package_name, process in list(self.processes.items()):
            # Check if the process is still running
            if process.poll() is not None:
                self.stats[package_name]["status"] = "stopped"
                logger.info(f"Package {package_name} has stopped")
                continue
                
            try:
                # Get process stats
                proc = psutil.Process(process.pid)
                
                # Update stats
                self.stats[package_name].update({
                    "last_check": time.time(),
                    "memory_usage": proc.memory_info().rss / (1024 * 1024),  # MB
                    "cpu_usage": proc.cpu_percent(interval=0.1),
                    "status": "running",
                    "uptime": time.time() - self.stats[package_name]["start_time"]
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                self.stats[package_name]["status"] = "error"
                logger.error(f"Failed to get stats for {package_name}")
    
    def display_stats(self) -> None:
        """Display statistics for all packages."""
        table = Table(title="Package Monitor")
        
        table.add_column("Package", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("PID", style="blue")
        table.add_column("Memory (MB)", style="magenta")
        table.add_column("CPU %", style="yellow")
        table.add_column("Uptime", style="white")
        
        for package_name, process in self.processes.items():
            pid = process.pid if process.poll() is None else "N/A"
            stats = self.stats.get(package_name, {})
            status = stats.get("status", "unknown")
            
            # Set status color
            status_style = "green" if status == "running" else "red"
            
            # Format memory and CPU
            memory = f"{stats.get('memory_usage', 0):.2f}" if status == "running" else "N/A"
            cpu = f"{stats.get('cpu_usage', 0):.1f}" if status == "running" else "N/A"
            
            # Format uptime
            uptime = "N/A"
            if status == "running" and "uptime" in stats:
                seconds = int(stats["uptime"])
                minutes, seconds = divmod(seconds, 60)
                hours, minutes = divmod(minutes, 60)
                uptime = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            
            table.add_row(
                package_name,
                f"[{status_style}]{status}[/{status_style}]",
                str(pid),
                memory,
                cpu,
                uptime
            )
        
        console.clear()
        console.print(table)
    
    def monitor_output(self, package_name: str) -> None:
        """
        Monitor and display output from a package.
        
        Args:
            package_name: Name of the package to monitor
        """
        if package_name not in self.processes:
            console.print(f"[red]Package {package_name} is not running[/red]")
            return
            
        process = self.processes[package_name]
        
        if process.poll() is not None:
            console.print(f"[yellow]Package {package_name} has stopped[/yellow]")
            return
            
        console.print(f"[green]Monitoring output for {package_name}...[/green]")
        console.print("[yellow]Press Ctrl+C to stop monitoring[/yellow]")
        
        try:
            while process.poll() is None:
                # Read output line by line
                stdout_line = process.stdout.readline() if process.stdout else ""
                stderr_line = process.stderr.readline() if process.stderr else ""
                
                if stdout_line:
                    console.print(f"[white]{stdout_line.strip()}[/white]")
                    
                if stderr_line:
                    console.print(f"[red]{stderr_line.strip()}[/red]")
                    
                # Sleep briefly to avoid high CPU usage
                time.sleep(0.1)
                
        except KeyboardInterrupt:
            console.print("[yellow]Stopped monitoring[/yellow]")
        
        console.print(f"[green]Finished monitoring {package_name}[/green]")
    
    def run_monitor(self, refresh_interval: int = 2) -> None:
        """
        Run the package monitor indefinitely, updating stats at regular intervals.
        
        Args:
            refresh_interval: Interval in seconds between updates
        """
        try:
            while True:
                self.update_stats()
                self.display_stats()
                time.sleep(refresh_interval)
        except KeyboardInterrupt:
            console.print("[yellow]Stopping monitor...[/yellow]")
            
            # Stop all running packages
            for package_name in list(self.processes.keys()):
                self.stop_package(package_name)
                
            console.print("[green]All packages stopped[/green]")

def main():
    """Main entry point for the package monitor CLI."""
    parser = argparse.ArgumentParser(
        description="Monitor and run installed Python packages"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List installed packages")
    
    # Start command
    start_parser = subparsers.add_parser("start", help="Start a package")
    start_parser.add_argument("package", help="Package name to start")
    start_parser.add_argument("args", nargs="*", help="Arguments to pass to the package")
    
    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop a running package")
    stop_parser.add_argument("package", help="Package name to stop")
    
    # Monitor command
    monitor_parser = subparsers.add_parser("monitor", help="Monitor running packages")
    monitor_parser.add_argument("--refresh", type=int, default=2, help="Refresh interval in seconds")
    
    # Run command (starts and monitors in one step)
    run_parser = subparsers.add_parser("run", help="Run and monitor packages")
    run_parser.add_argument("packages", nargs="+", help="Package names to run and monitor")
    run_parser.add_argument("--refresh", type=int, default=2, help="Refresh interval in seconds")
    
    # Watch command
    watch_parser = subparsers.add_parser("watch", help="Watch output from a package")
    watch_parser.add_argument("package", help="Package name to watch")
    
    args = parser.parse_args()
    
    # Create package monitor
    monitor = PackageMonitor()
    
    if args.command == "list":
        packages = monitor.get_installed_packages()
        
        table = Table(title="Installed Python Packages")
        table.add_column("Package Name", style="cyan")
        table.add_column("Status", style="green")
        
        for package in sorted(packages):
            status = "Available"
            if package in monitor.processes:
                status = "Running" if monitor.processes[package].poll() is None else "Stopped"
                
            status_style = "green" if status == "Running" else "yellow" if status == "Available" else "red"
            table.add_row(package, f"[{status_style}]{status}[/{status_style}]")
            
        console.print(table)
        
    elif args.command == "start":
        if monitor.start_package(args.package, args.args):
            console.print(f"[green]Package {args.package} started[/green]")
        else:
            console.print(f"[red]Failed to start package {args.package}[/red]")
            
    elif args.command == "stop":
        if monitor.stop_package(args.package):
            console.print(f"[green]Package {args.package} stopped[/green]")
        else:
            console.print(f"[red]Failed to stop package {args.package}[/red]")
            
    elif args.command == "monitor":
        console.print("[green]Starting package monitor...[/green]")
        monitor.run_monitor(args.refresh)
        
    elif args.command == "run":
        # Start all packages
        for package in args.packages:
            if monitor.start_package(package):
                console.print(f"[green]Package {package} started[/green]")
            else:
                console.print(f"[red]Failed to start package {package}[/red]")
        
        # Monitor them
        console.print("[green]Starting package monitor...[/green]")
        monitor.run_monitor(args.refresh)
        
    elif args.command == "watch":
        monitor.monitor_output(args.package)
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 