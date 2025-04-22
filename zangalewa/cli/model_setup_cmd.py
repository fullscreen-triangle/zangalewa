"""
Command line interface for setting up local language models.
"""

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint

from zangalewa.utils.model_setup import (
    check_ollama_installed, check_ollama_running,
    get_installed_models, start_ollama_service,
    setup_local_models, model_setup_wizard
)

console = Console()

@click.group(help="Commands for setting up and managing required language models")
def models():
    """Model management commands for required language models."""
    pass

@models.command(help="Check the status of required models and services")
def status():
    """Check the status of required models and Ollama service."""
    console.print(Panel.fit("[bold]Required Model Status[/bold]"))
    
    # Check Ollama installation
    ollama_installed = check_ollama_installed()
    if ollama_installed:
        console.print("[green]✓[/green] Ollama is installed")
    else:
        console.print("[red]✗[/red] Ollama is [bold]not[/bold] installed")
        console.print("   [red]ERROR:[/red] Ollama is [bold]REQUIRED[/bold] for Zangalewa to function")
        console.print("   Install Ollama from [link]https://ollama.ai[/link]")
        return
    
    # Check if Ollama service is running
    ollama_running = check_ollama_running()
    if ollama_running:
        console.print("[green]✓[/green] Ollama service is running")
    else:
        console.print("[red]✗[/red] Ollama service is [bold]not[/bold] running")
        console.print("   [red]ERROR:[/red] Ollama service must be running for Zangalewa to function")
        console.print("   Start Ollama with [bold]ollama serve[/bold]")
        return
    
    # Show installed models
    installed_models = get_installed_models()
    
    if installed_models:
        table = Table(title="Required Models Status")
        table.add_column("Model")
        table.add_column("Purpose")
        table.add_column("Status")
        
        required_models = {
            "mistral": "General interaction and orchestration",
            "codellama:7b-python": "Python code generation and analysis",
            "deepseek-coder:6.7b": "React and general code generation"
        }
        
        all_installed = True
        for model, purpose in required_models.items():
            if model in installed_models:
                table.add_row(model, purpose, "[green]Installed[/green]")
            else:
                table.add_row(model, purpose, "[red]MISSING - REQUIRED[/red]")
                all_installed = False
                
        console.print(table)
        
        if all_installed:
            console.print("[green]✓ All required models are installed! Zangalewa is ready to use.[/green]")
        else:
            console.print("[red]✗ Some required models are missing. Zangalewa will not function properly.[/red]")
            console.print("Run [bold]zangalewa models setup --all[/bold] to install all required models")
    else:
        console.print("[red]✗ No models are installed[/red]")
        console.print("[red]Zangalewa requires local models to function[/red]")
        console.print("Run [bold]zangalewa models setup --all[/bold] to install required models")

@models.command(help="Set up required local models (REQUIRED for Zangalewa to function)")
@click.option("--all", is_flag=True, help="Install all required models (recommended)")
@click.option("--mistral", is_flag=True, help="Install Mistral 7B model (required for orchestration)")
@click.option("--codellama", is_flag=True, help="Install CodeLlama 7B Python model (required for Python code)")
@click.option("--deepseek", is_flag=True, help="Install DeepSeek Coder 6.7B model (required for React code)")
@click.option("--wizard", is_flag=True, help="Run the interactive setup wizard")
def setup(all, mistral, codellama, deepseek, wizard):
    """Set up required language models - REQUIRED for Zangalewa to function."""
    if wizard:
        model_setup_wizard()
        return
    
    models_to_install = []
    
    if all:
        models_to_install = ["mistral", "codellama:7b-python", "deepseek-coder:6.7b"]
    else:
        if mistral:
            models_to_install.append("mistral")
        if codellama:
            models_to_install.append("codellama:7b-python")
        if deepseek:
            models_to_install.append("deepseek-coder:6.7b")
    
    if not models_to_install:
        console.print("[yellow]No models selected for installation[/yellow]")
        console.print("[red]WARNING: Zangalewa requires all three models to function properly[/red]")
        console.print("Use --all to install all required models (recommended)")
        return
    
    # Check Ollama installation
    if not check_ollama_installed():
        console.print("[red]ERROR: Ollama is not installed[/red]")
        console.print("[red]Ollama is REQUIRED for Zangalewa to function[/red]")
        console.print("Install Ollama from [link]https://ollama.ai[/link]")
        return
    
    # Check if Ollama service is running
    if not check_ollama_running():
        console.print("Ollama service is not running. Attempting to start...")
        if not start_ollama_service():
            console.print("[red]ERROR: Failed to start Ollama service[/red]")
            console.print("[red]Ollama service must be running for Zangalewa to function[/red]")
            console.print("Start it manually with [bold]ollama serve[/bold] and try again")
            return
        console.print("[green]Successfully started Ollama service[/green]")
    
    # Install models
    console.print(f"Installing {len(models_to_install)} models...")
    
    with console.status("Installing models..."):
        results = setup_local_models(models_to_install)
    
    # Show summary
    table = Table(title="Installation Results")
    table.add_column("Model")
    table.add_column("Status")
    
    all_success = True
    for model, success in results.items():
        status = "[green]Installed[/green]" if success else "[red]Failed[/red]"
        table.add_row(model, status)
        if not success:
            all_success = False
    
    console.print(table)
    
    # Show final message
    if all_success:
        if len(models_to_install) == 3:  # All three required models
            console.print("[green]✓ All required models are installed! Zangalewa is ready to use.[/green]")
        else:
            # Check if all three required models are installed
            installed = get_installed_models()
            required = {"mistral", "codellama:7b-python", "deepseek-coder:6.7b"}
            
            if all(model in installed for model in required):
                console.print("[green]✓ All required models are installed! Zangalewa is ready to use.[/green]")
            else:
                console.print("[yellow]⚠ Some required models may still be missing.[/yellow]")
                console.print("Run [bold]zangalewa models status[/bold] to check which models are installed")
    else:
        console.print("[red]✗ Some models failed to install. Zangalewa requires all models to function properly.[/red]")
        console.print("Please try again or check the Ollama documentation for troubleshooting.")

if __name__ == "__main__":
    models() 