"""
Command executor for safely running shell commands.
"""

import os
import shlex
import asyncio
import logging
import shutil
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import psutil

logger = logging.getLogger(__name__)

@dataclass
class ResourceUsage:
    """Resource usage information for a command."""
    cpu_percent: float
    memory_mb: float
    elapsed_time: float


@dataclass
class ExecutionResult:
    """Result of a command execution."""
    success: bool
    command: str
    return_code: int
    stdout: str
    stderr: str
    resources: Optional[ResourceUsage] = None
    error_analysis: Optional[Dict[str, Any]] = None


class CommandExecutor:
    """
    Executes shell commands safely and monitors their execution.
    """
    
    # List of potentially dangerous commands/patterns that are blocked
    BLOCKED_COMMANDS = [
        "rm -rf /", "rm -rf /*", "mkfs", "dd if=/dev/zero",
        "> /dev/sda", "chmod -R 777 /", ":(){:|:&};:"
    ]
    
    def __init__(self):
        """Initialize the command executor."""
        self.process_monitor = ProcessMonitor()
    
    async def execute(
        self, 
        command: str, 
        cwd: Optional[str] = None,
        env: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = 60.0
    ) -> ExecutionResult:
        """
        Execute a shell command safely.
        
        Args:
            command: The command to execute
            cwd: Working directory for the command
            env: Environment variables to set
            timeout: Timeout in seconds (None for no timeout)
            
        Returns:
            ExecutionResult with command output and resource usage
            
        Raises:
            ValueError: If the command is blocked for security reasons
            asyncio.TimeoutError: If the command times out
        """
        # Validate command
        self._validate_command(command)
        
        # Prepare environment
        full_env = os.environ.copy()
        if env:
            full_env.update(env)
        
        # Start monitoring resources
        self.process_monitor.start()
        
        try:
            # Execute the command
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                env=full_env
            )
            
            # Wait for completion with timeout
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=timeout
                )
                
                # Stop monitoring and get resource usage
                resources = self.process_monitor.stop(process.pid)
                
                return ExecutionResult(
                    success=process.returncode == 0,
                    command=command,
                    return_code=process.returncode,
                    stdout=stdout.decode('utf-8', errors='replace'),
                    stderr=stderr.decode('utf-8', errors='replace'),
                    resources=resources
                )
                
            except asyncio.TimeoutError:
                # Command timed out, kill the process
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
                
                # Stop monitoring
                resources = self.process_monitor.stop(process.pid)
                
                return ExecutionResult(
                    success=False,
                    command=command,
                    return_code=-1,
                    stdout="",
                    stderr=f"Command timed out after {timeout} seconds",
                    resources=resources
                )
                
        except Exception as e:
            # Stop monitoring
            self.process_monitor.stop()
            
            return ExecutionResult(
                success=False,
                command=command,
                return_code=-1,
                stdout="",
                stderr=f"Error executing command: {str(e)}",
                resources=None
            )
    
    def _validate_command(self, command: str) -> None:
        """
        Validate that a command is safe to execute.
        
        Args:
            command: The command to validate
            
        Raises:
            ValueError: If the command is blocked
        """
        # Check against blocked command patterns
        command_lower = command.lower()
        for blocked in self.BLOCKED_COMMANDS:
            if blocked in command_lower:
                logger.warning(f"Blocked dangerous command: {command}")
                raise ValueError(
                    f"The command contains a potentially dangerous pattern: {blocked}"
                )
        
        # Check if common utilities exist (to detect base system access)
        if command.startswith(("/bin/", "/usr/bin/")) and not shutil.which(command.split()[0]):
            logger.warning(f"Attempted to execute non-existent utility: {command}")
            raise ValueError(f"Command not found: {command.split()[0]}")
        
        logger.debug(f"Command validated as safe: {command}")


class ProcessMonitor:
    """
    Monitors resource usage of processes.
    """
    
    def __init__(self):
        """Initialize the process monitor."""
        self.start_time = None
        self.process = None
    
    def start(self) -> None:
        """Start monitoring resources."""
        self.start_time = asyncio.get_event_loop().time()
    
    def stop(self, pid: Optional[int] = None) -> Optional[ResourceUsage]:
        """
        Stop monitoring and return resource usage.
        
        Args:
            pid: Process ID to get resource usage for
            
        Returns:
            ResourceUsage object or None if no process was found
        """
        if not self.start_time:
            return None
        
        elapsed_time = asyncio.get_event_loop().time() - self.start_time
        
        # Get resource usage for the process if pid is provided
        if pid:
            try:
                process = psutil.Process(pid)
                with process.oneshot():
                    cpu_percent = process.cpu_percent(interval=0.1)
                    memory_info = process.memory_info()
                    memory_mb = memory_info.rss / (1024 * 1024)  # Convert to MB
                
                return ResourceUsage(
                    cpu_percent=cpu_percent,
                    memory_mb=memory_mb,
                    elapsed_time=elapsed_time
                )
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Reset monitor state
        self.start_time = None
        
        return ResourceUsage(
            cpu_percent=0.0,
            memory_mb=0.0,
            elapsed_time=elapsed_time
        ) 