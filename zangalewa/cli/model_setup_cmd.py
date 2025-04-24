"""
Command line interface for HuggingFace API model information.
"""

import click
from rich.console import Console
from rich.panel import Panel
from rich import print as rprint

from zangalewa.utils.config import get_config

console = Console()

@click.group(help="Commands for managing HuggingFace API integration")
def models():
    """Model management commands for HuggingFace API integration."""
    pass

@models.command(help="Check the status of HuggingFace API configuration")
def status():
    """Check if the HuggingFace API key is configured."""
    console.print(Panel.fit("[bold]HuggingFace API Status[/bold]"))
    
    # Check for API key
    config = get_config()
    api_key = config.get("HUGGINGFACE_API_KEY")
    
    if api_key:
        console.print("[green]✓[/green] HuggingFace API key is configured")
        
        # Display configured models
        huggingface_models = config.get("llm", {}).get("huggingface_models", {})
        if huggingface_models:
            console.print("\nConfigured models:")
            for purpose, model in huggingface_models.items():
                console.print(f"  [blue]•[/blue] {purpose}: [cyan]{model}[/cyan]")
        
        console.print("\n[green]Zangalewa is ready to use with HuggingFace models![/green]")
    else:
        console.print("[red]✗[/red] HuggingFace API key is [bold]not[/bold] configured")
        console.print("   [red]ERROR:[/red] HuggingFace API key is [bold]REQUIRED[/bold] for Zangalewa to function")
        console.print("\nPlease set your HuggingFace API key in one of the following ways:")
        console.print("  1. Set the HUGGINGFACE_API_KEY environment variable")
        console.print("  2. Add it to your .env file")
        console.print("  3. Update your configuration file")
        
        console.print("\nTo obtain a HuggingFace API key:")
        console.print("  1. Create an account at [link]https://huggingface.co[/link]")
        console.print("  2. Go to your profile settings > Access Tokens")
        console.print("  3. Create a new token with 'read' scope")

@models.command(help="Show information about using HuggingFace models")
def info():
    """Show information about the HuggingFace models used by Zangalewa."""
    console.print(Panel.fit("[bold]HuggingFace Models Information[/bold]"))
    
    # Get configuration
    config = get_config()
    huggingface_models = config.get("llm", {}).get("huggingface_models", {})
    
    # Display general information
    console.print("Zangalewa now uses HuggingFace's API for all language model interactions.")
    console.print("This allows you to access powerful models without downloading them locally.")
    
    # Display configured models
    if huggingface_models:
        console.print("\n[bold]Currently configured models:[/bold]")
        for purpose, model in huggingface_models.items():
            console.print(f"  [blue]•[/blue] {purpose} ({purpose.capitalize()} tasks): [cyan]{model}[/cyan]")
    
    # Display API key information
    console.print("\n[bold]API Key Configuration:[/bold]")
    console.print("To use HuggingFace models, you need to set your API key in one of these ways:")
    console.print("  1. Environment variable: HUGGINGFACE_API_KEY=your_key")
    console.print("  2. In .env file: HUGGINGFACE_API_KEY=your_key")
    console.print("  3. In configuration file under huggingface section")
    
    # Display how to get an API key
    console.print("\n[bold]Getting a HuggingFace API Key:[/bold]")
    console.print("  1. Create an account at [link]https://huggingface.co[/link]")
    console.print("  2. Go to your profile settings > Access Tokens")
    console.print("  3. Create a new token with 'read' scope")
    console.print("  4. Use this token as your HUGGINGFACE_API_KEY")

if __name__ == "__main__":
    models() 