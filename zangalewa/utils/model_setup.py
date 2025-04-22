"""
Utility functions for setting up and checking local language models.
"""

import os
import sys
import logging
import subprocess
import platform
from typing import List, Dict

logger = logging.getLogger(__name__)

def check_ollama_installed() -> bool:
    """Check if Ollama is installed on the system."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(["where", "ollama"], capture_output=True, text=True)
        else:
            result = subprocess.run(["which", "ollama"], capture_output=True, text=True)
        return result.returncode == 0
    except Exception:
        return False

def check_ollama_running() -> bool:
    """Check if the Ollama service is running."""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        return response.status_code == 200
    except Exception:
        return False

def get_installed_models() -> List[str]:
    """Get a list of installed Ollama models."""
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            return [model.get("name") for model in response.json().get("models", [])]
        return []
    except Exception:
        return []

def start_ollama_service() -> bool:
    """Attempt to start the Ollama service."""
    try:
        if platform.system() == "Windows":
            subprocess.Popen(["ollama", "serve"], 
                            stdout=subprocess.PIPE, 
                            stderr=subprocess.PIPE,
                            creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            subprocess.Popen(["ollama", "serve"], 
                            stdout=subprocess.PIPE, 
                            stderr=subprocess.PIPE,
                            start_new_session=True)
        
        # Give it a moment to start
        import time
        time.sleep(3)
        
        return check_ollama_running()
    except Exception as e:
        logger.error(f"Failed to start Ollama service: {e}")
        return False

def install_model(model_name: str) -> bool:
    """Install a specific Ollama model."""
    try:
        print(f"Installing model {model_name}. This may take a while...")
        result = subprocess.run(["ollama", "pull", model_name], 
                                stdout=sys.stdout, 
                                stderr=sys.stderr)
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Failed to install model {model_name}: {e}")
        return False

def setup_local_models(models: List[str] = None) -> Dict[str, bool]:
    """
    Set up required local models for use with Zangalewa.
    
    Args:
        models: List of model names to install. If None, installs required models.
        
    Returns:
        Dictionary of model names and their installation status
    """
    if models is None:
        models = ["mistral", "codellama:7b-python", "deepseek-coder:6.7b"]
    
    results = {}
    
    # Check if Ollama is installed
    if not check_ollama_installed():
        print("\n[ERROR] Ollama is not installed. Ollama is REQUIRED for Zangalewa to function.")
        print("Please install Ollama from https://ollama.ai")
        print("After installation, run this setup again to install the required models.")
        return {model: False for model in models}
    
    # Check if Ollama service is running
    if not check_ollama_running():
        print("\nOllama service is not running. Attempting to start...")
        if not start_ollama_service():
            print("[ERROR] Failed to start Ollama service. Please start it manually and run this setup again.")
            print("You can start it by running 'ollama serve' in a terminal.")
            return {model: False for model in models}
    
    # Get currently installed models
    installed_models = get_installed_models()
    
    # Install required models
    print("\nZangalewa requires the following models to function properly:")
    print(" - mistral: For general interaction and orchestration")
    print(" - codellama:7b-python: For Python code generation and analysis")
    print(" - deepseek-coder:6.7b: For React and general code generation")
    
    for model in models:
        if model in installed_models:
            print(f"\n✓ Model {model} is already installed.")
            results[model] = True
        else:
            print(f"\n→ Installing required model {model}...")
            success = install_model(model)
            results[model] = success
            if success:
                print(f"✓ Successfully installed {model}.")
            else:
                print(f"✗ Failed to install {model}. Zangalewa requires this model to function properly.")
    
    # Check if all required models are installed
    all_installed = all(results.values())
    if all_installed:
        print("\n✓ All required models are installed! Zangalewa is ready to use.")
    else:
        print("\n✗ Some required models could not be installed. Zangalewa needs all models to function properly.")
        print("Please try running the setup again or check the Ollama documentation for troubleshooting.")
    
    return results

def model_setup_wizard():
    """Interactive wizard to guide users through model setup."""
    print("\n" + "=" * 60)
    print("Zangalewa Required Model Setup")
    print("=" * 60)
    
    print("\nThis wizard will help you set up the required language models for Zangalewa.")
    print("Zangalewa REQUIRES local models to function - these models are the core of the application.")
    
    print("\nChecking for Ollama installation...")
    if not check_ollama_installed():
        print("\n[ERROR] Ollama is not installed. Ollama is REQUIRED for Zangalewa to function.")
        print("Please install Ollama from https://ollama.ai")
        print("After installation, run this wizard again.")
        return
    
    print("✓ Ollama is installed!")
    
    print("\nChecking if Ollama service is running...")
    if not check_ollama_running():
        print("Ollama service is not running. Attempting to start...")
        if not start_ollama_service():
            print("[ERROR] Failed to start Ollama service. Please start it manually and try again.")
            print("You can start it by running 'ollama serve' in a terminal.")
            return
        print("✓ Successfully started Ollama service.")
    else:
        print("✓ Ollama service is running!")
    
    print("\nCurrently installed models:")
    installed_models = get_installed_models()
    if installed_models:
        for model in installed_models:
            print(f" - {model}")
    else:
        print(" None")
    
    print("\nRequired models for Zangalewa:")
    print(" - mistral: For general interaction and orchestration")
    print(" - codellama:7b-python: For Python code generation and analysis")
    print(" - deepseek-coder:6.7b: For React and general code generation")
    
    print("\nAll these models are REQUIRED for Zangalewa to function.")
    print("Would you like to install the missing required models now? (y/n)")
    choice = input("> ").strip().lower()
    
    if choice == 'y' or choice == 'yes':
        # Install required models
        results = setup_local_models()
        
        # Show summary
        print("\nInstallation summary:")
        for model, success in results.items():
            status = "Installed" if success else "Failed"
            print(f" - {model}: {status}")
        
        # Final instructions
        print("\nSetup complete!")
        if all(results.values()):
            print("✓ All required models are installed! Zangalewa is ready to use.")
        else:
            print("✗ Some required models could not be installed. Zangalewa needs all models to function properly.")
            print("Please try running the setup again or check the Ollama documentation for troubleshooting.")
    else:
        print("\nSetup canceled. Zangalewa requires these models to function properly.")
        print("Please run the setup again when you're ready to install the required models.")
    
    print("=" * 60 + "\n")

if __name__ == "__main__":
    model_setup_wizard() 