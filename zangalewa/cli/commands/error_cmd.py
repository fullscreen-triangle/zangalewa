"""
Error command handler for demonstrating the error handling capabilities.
"""

import asyncio
import logging
from typing import Dict, Any, Optional

from zangalewa.core.errors.detector import ErrorDetector
from zangalewa.core.errors.resolver import ErrorResolver
from zangalewa.core.errors.search import ErrorSearcher
from zangalewa.core.executor import CommandExecutor
from zangalewa.core.llm import LLMManager
from zangalewa.cli.ui.error_display import ErrorDisplay
from zangalewa.utils.config import get_config

logger = logging.getLogger(__name__)

class ErrorCommandHandler:
    """Command handler for error-related operations."""
    
    def __init__(
        self,
        llm_manager: Optional[LLMManager] = None,
        command_executor: Optional[CommandExecutor] = None
    ):
        """
        Initialize the error command handler.
        
        Args:
            llm_manager: LLM manager for generating solutions
            command_executor: Command executor for testing solutions
        """
        self.llm_manager = llm_manager
        self.command_executor = command_executor or CommandExecutor()
        self.error_resolver = ErrorResolver(
            llm_manager=llm_manager,
            command_executor=command_executor
        )
        self.error_display = ErrorDisplay()
        
    async def handle_error(self, command: str, return_code: int, error_output: str, code_context: Optional[Dict[str, Any]] = None) -> None:
        """
        Handle an error from a command execution.
        
        Args:
            command: The command that produced the error
            return_code: The return code of the command
            error_output: The error output text
            code_context: Optional code context information
        """
        logger.info(f"Handling error from command: {command}")
        
        # Analyze the error
        error_analysis = await self.error_resolver.analyze_error(
            command=command,
            return_code=return_code,
            error_text=error_output
        )
        
        # Get user-friendly explanation
        error_info = await self.error_resolver.explain_error_to_user(
            error_analysis=error_analysis,
            code_context=code_context
        )
        
        # Display the error to the user
        self.error_display.display_error(error_info, show_sources=True)
        
        # Offer to apply solutions if there are any
        if error_info.get("solutions"):
            await self._offer_solutions(error_analysis)
    
    async def _offer_solutions(self, error_analysis) -> None:
        """
        Offer to apply solutions to the error.
        
        Args:
            error_analysis: The error analysis
        """
        if not error_analysis.solutions:
            return
            
        self.error_display.console.print()
        self.error_display.console.print("[bold]Would you like to apply any of these solutions?[/bold]")
        self.error_display.console.print("Enter the solution number or 'n' to skip: ", end="")
        
        choice = input().strip()
        
        if choice.lower() in ["n", "no", "skip"]:
            return
            
        try:
            solution_index = int(choice) - 1
            if 0 <= solution_index < len(error_analysis.solutions):
                solution = error_analysis.solutions[solution_index]
                
                # Confirm before applying
                self.error_display.console.print()
                self.error_display.console.print(f"[bold]Applying solution {solution_index + 1}:[/bold]")
                if "command" in solution:
                    self.error_display.console.print(f"Command: {solution['command']}")
                
                self.error_display.console.print("Proceed? (y/n): ", end="")
                confirm = input().strip().lower()
                
                if confirm in ["y", "yes"]:
                    # Execute the solution command if available
                    if "command" in solution and solution["command"]:
                        self.error_display.console.print("[bold]Applying solution...[/bold]")
                        
                        result = await self.command_executor.execute(solution["command"])
                        
                        # Display results
                        self.error_display.display_solution_progress(
                            solution=solution,
                            success=result.success,
                            output=result.output if result.success else result.error
                        )
                    else:
                        self.error_display.console.print(
                            "[yellow]This solution does not have an automatic command to run.[/yellow]"
                        )
                        if "description" in solution:
                            self.error_display.console.print("Please follow these instructions manually:")
                            self.error_display.console.print(solution["description"])
            else:
                self.error_display.console.print("[bold red]Invalid solution number.[/bold red]")
        except ValueError:
            self.error_display.console.print("[bold red]Invalid input. Please enter a number or 'n'.[/bold red]")
            
    async def demonstrate_error_handling(self) -> None:
        """
        Demonstrate the error handling capabilities with sample errors.
        """
        self.error_display.console.print("[bold]Error Handling Demonstration[/bold]")
        self.error_display.console.print("This will demonstrate the enhanced error handling capabilities.")
        
        # Sample errors to demonstrate
        demo_errors = [
            {
                "name": "Python Import Error",
                "command": "python -c \"import non_existent_module\"",
                "context": {
                    "imports": ["os", "sys", "re", "json"],
                    "venv": {"path": "/path/to/venv"}
                }
            },
            {
                "name": "React Hook Conditional Error",
                "command": "npm run build",
                "error": """
Error: React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render.

File: src/components/UserProfile.js:23
  21 | function UserProfile({ user }) {
  22 |   // This breaks the rules of Hooks
> 23 |   if (user) {
  24 |     const [userState, setUserState] = useState(user);
  25 |   }
                """,
                "context": {
                    "component": {
                        "name": "UserProfile",
                        "imports": ["React", "useState", "useEffect"],
                        "hooks_in_conditionals": [24]
                    }
                }
            },
            {
                "name": "NPM Package Not Found",
                "command": "npm install @xfame/reactcomponent",
                "error": """
npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/@xfame/reactcomponent - Not found
npm ERR! 404 
npm ERR! 404  '@xfame/reactcomponent@latest' is not in the npm registry.
npm ERR! 404 You should bug the author to publish it (or use the name yourself!)
npm ERR! 404 
npm ERR! 404 Note that you can also install from a
npm ERR! 404 tarball, folder, http url, or git url.
                """
            }
        ]
        
        # Let user choose an error to demonstrate
        self.error_display.console.print()
        self.error_display.console.print("[bold]Choose an error to demonstrate:[/bold]")
        for i, error in enumerate(demo_errors, 1):
            self.error_display.console.print(f"{i}. {error['name']}")
            
        self.error_display.console.print("Enter choice (1-3): ", end="")
        choice = input().strip()
        
        try:
            error_index = int(choice) - 1
            if 0 <= error_index < len(demo_errors):
                demo = demo_errors[error_index]
                
                # Use pre-defined error if available, otherwise try to execute the command
                if "error" in demo:
                    error_output = demo["error"]
                    return_code = 1
                else:
                    # Try to actually run the command to get real error output
                    self.error_display.console.print(f"[bold]Running command:[/bold] {demo['command']}")
                    result = await self.command_executor.execute(demo["command"])
                    error_output = result.error
                    return_code = result.return_code
                    
                # Handle the error
                await self.handle_error(
                    command=demo["command"],
                    return_code=return_code,
                    error_output=error_output,
                    code_context=demo.get("context")
                )
            else:
                self.error_display.console.print("[bold red]Invalid choice.[/bold red]")
        except ValueError:
            self.error_display.console.print("[bold red]Invalid input. Please enter a number.[/bold red]")
            
async def command_error_demo(args: Dict[str, Any]) -> None:
    """
    Demonstrate the error handling capabilities.
    
    Args:
        args: Command arguments
    """
    # Initialize components
    config = get_config()
    llm_manager = None
    
    # Try to initialize LLM manager if keys are available
    api_key = config.get("OPENAI_API_KEY") or config.get("ANTHROPIC_API_KEY")
    if api_key:
        llm_manager = LLMManager()
    
    # Create command handler
    handler = ErrorCommandHandler(llm_manager=llm_manager)
    
    # Run demonstration
    await handler.demonstrate_error_handling() 