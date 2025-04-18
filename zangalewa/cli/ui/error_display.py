"""
Error display UI component for presenting user-friendly error explanations.
"""

from typing import Dict, List, Any, Optional
import textwrap
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.table import Table
from rich.syntax import Syntax
from rich.text import Text

class ErrorDisplay:
    """
    UI component for displaying error information in a user-friendly way.
    """
    
    def __init__(self, console: Optional[Console] = None):
        """
        Initialize the error display.
        
        Args:
            console: Rich console for output
        """
        self.console = console or Console()
        
    def display_error(self, error_info: Dict[str, Any], show_sources: bool = False) -> None:
        """
        Display error information to the user.
        
        Args:
            error_info: Error information from ErrorResolver.explain_error_to_user()
            show_sources: Whether to show the search result sources
        """
        # Display error title
        self.console.print()
        self.console.print(Panel(
            Text(error_info["title"], style="bold red"),
            expand=False
        ))
        
        # Display explanation
        self.console.print()
        self.console.print("[bold]What happened:[/bold]")
        self.console.print(Text(error_info["explanation"]))
        
        # Display context-specific info if available
        if error_info.get("context_specific_info"):
            self.console.print()
            self.console.print(Panel(
                Text(error_info["context_specific_info"], style="yellow"),
                title="Context-Specific Information",
                expand=False
            ))
        
        # Display common causes
        if error_info.get("common_causes"):
            self.console.print()
            self.console.print("[bold]Common causes:[/bold]")
            for i, cause in enumerate(error_info["common_causes"], 1):
                self.console.print(f" {i}. {cause}")
        
        # Display solutions
        if error_info.get("solutions"):
            self.console.print()
            self.console.print("[bold]Suggested solutions:[/bold]")
            
            for i, solution in enumerate(error_info["solutions"], 1):
                confidence_style = {
                    "high": "green",
                    "medium": "yellow",
                    "low": "red"
                }.get(solution.get("confidence", "medium"), "yellow")
                
                solution_panel = Panel(
                    Text(solution["description"]),
                    title=f"Solution {i}",
                    subtitle=f"Confidence: [bold {confidence_style}]{solution.get('confidence', 'medium')}[/bold {confidence_style}]",
                    expand=False
                )
                self.console.print(solution_panel)
                
                # If there's a command to run, display it
                if "action" in solution and solution["action"] != "See explanation":
                    self.console.print()
                    self.console.print("To implement this solution, run:")
                    syntax = Syntax(
                        solution["action"], 
                        "bash", 
                        theme="monokai", 
                        line_numbers=False,
                        word_wrap=True
                    )
                    self.console.print(syntax)
                
                self.console.print()
        
        # Display search sources if requested
        if show_sources and error_info.get("sources"):
            self.console.print()
            self.console.print("[bold]Sources consulted:[/bold]")
            
            table = Table(show_header=True)
            table.add_column("Source", style="cyan")
            table.add_column("Title")
            table.add_column("Relevance", style="green")
            
            for source in error_info["sources"][:5]:  # Show top 5 sources
                metrics = source.get("metrics", {})
                relevance = metrics.get("composite_score", 0)
                relevance_str = f"{relevance:.1f}/10" if relevance else "N/A"
                
                table.add_row(
                    source.get("source", "Unknown"),
                    textwrap.shorten(source.get("title", ""), width=60, placeholder="..."),
                    relevance_str
                )
                
            self.console.print(table)
        
    def display_quick_error(self, error_text: str, description: str) -> None:
        """
        Display a simple error message for immediate feedback.
        
        Args:
            error_text: The error text
            description: A brief description
        """
        self.console.print()
        self.console.print(f"[bold red]Error:[/bold red] {description}")
        self.console.print(Panel(
            Text(error_text, style="dim"),
            expand=False
        ))
        
    def display_solution_progress(self, solution: Dict[str, Any], success: bool, output: str) -> None:
        """
        Display the progress of a solution being applied.
        
        Args:
            solution: The solution being applied
            success: Whether the solution was successful
            output: Output from applying the solution
        """
        self.console.print()
        
        if success:
            self.console.print("[bold green]Solution applied successfully![/bold green]")
        else:
            self.console.print("[bold red]Solution failed to resolve the issue.[/bold red]")
            
        if output:
            self.console.print("Output:")
            self.console.print(Panel(
                Text(output),
                expand=False
            )) 