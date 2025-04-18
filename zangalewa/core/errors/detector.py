"""
Error detector for identifying and classifying errors in command output.
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple, Pattern
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class ErrorPattern:
    """A pattern for detecting specific types of errors."""
    pattern: Pattern
    error_type: str
    description: str
    search_query: str = ""
    user_friendly_explanation: str = ""  # Added field for user-friendly explanations
    common_causes: List[str] = field(default_factory=list)  # Added field for common causes


@dataclass
class ErrorAnalysis:
    """Analysis of an error with potential solutions."""
    error_text: str
    error_type: str
    description: str
    search_query: str
    user_friendly_explanation: str = ""  # Added field for user-friendly explanations
    common_causes: List[str] = field(default_factory=list)  # Added field for common causes
    solutions: List[Dict[str, Any]] = field(default_factory=list)
    sources: List[Dict[str, Any]] = field(default_factory=list)


class ErrorDetector:
    """
    Detects and analyzes errors in command output.
    """
    
    def __init__(self):
        """Initialize the error detector with common error patterns."""
        # Common error patterns for different tools and languages
        self.patterns = [
            # Python errors
            ErrorPattern(
                re.compile(r"ImportError: No module named '?([^']+)'?"),
                "python_import_error",
                "Python module import error",
                "python ImportError {0}",
                "A Python module is missing from your environment. This means Python tried to use a component that isn't installed.",
                ["The package is not installed in your current environment", 
                 "The package name is misspelled in your code",
                 "You're using a virtual environment that doesn't have this package"]
            ),
            ErrorPattern(
                re.compile(r"ModuleNotFoundError: No module named '?([^']+)'?"),
                "python_module_not_found",
                "Python module not found",
                "python ModuleNotFoundError {0}",
                "Python couldn't find a module you're trying to use. This typically means the module isn't installed in your environment.",
                ["The package is not installed in your current environment", 
                 "The package name is misspelled in your code",
                 "You're using a different Python interpreter than expected"]
            ),
            ErrorPattern(
                re.compile(r"SyntaxError: .*?\n.*?\n.*([\^]*)"),
                "python_syntax_error",
                "Python syntax error",
                "python SyntaxError",
                "There's an error in your Python code syntax - typically a typo, missing parenthesis, bracket, or incorrect indentation.",
                ["Missing or extra parentheses, brackets, or quotes",
                 "Incorrect indentation",
                 "Using Python 3 syntax in Python 2 or vice versa",
                 "Forgetting colons after if/for/while statements"]
            ),
            ErrorPattern(
                re.compile(r"TypeError: (.+)"),
                "python_type_error",
                "Python type error",
                "python TypeError {0}"
            ),
            ErrorPattern(
                re.compile(r"ValueError: (.+)"),
                "python_value_error",
                "Python value error",
                "python ValueError {0}"
            ),
            ErrorPattern(
                re.compile(r"AttributeError: .* has no attribute '(.+)'"),
                "python_attribute_error",
                "Python attribute error",
                "python AttributeError {0}"
            ),
            # Shell errors
            ErrorPattern(
                re.compile(r"command not found: (.+)"),
                "shell_command_not_found",
                "Shell command not found",
                "command not found {0}"
            ),
            ErrorPattern(
                re.compile(r"No such file or directory"),
                "file_not_found",
                "File or directory not found",
                "no such file or directory",
                "The system can't find the file or directory you're trying to access. It either doesn't exist or is in a different location.",
                ["The path is incorrect",
                 "The file/directory was moved or deleted",
                 "You're in the wrong working directory",
                 "Case sensitivity issues (especially on Linux/macOS)"]
            ),
            ErrorPattern(
                re.compile(r"Permission denied"),
                "permission_denied",
                "Permission denied for file or directory",
                "shell permission denied",
                "You don't have sufficient permissions to access or modify the file or directory.",
                ["File is owned by another user",
                 "File permissions are restrictive",
                 "Directory permissions prevent access",
                 "Need to use sudo/admin privileges"]
            ),
            # Git errors
            ErrorPattern(
                re.compile(r"fatal: not a git repository"),
                "git_not_a_repo",
                "Not a git repository",
                "git fatal not a repository"
            ),
            ErrorPattern(
                re.compile(r"fatal: unable to access '(.+)': (SSL certificate problem|Could not resolve host)"),
                "git_connection_error",
                "Git connection or SSL error",
                "git connection error SSL certificate"
            ),
            ErrorPattern(
                re.compile(r"error: failed to push some refs to '(.+)'"),
                "git_push_error",
                "Git push error",
                "git failed to push refs"
            ),
            # Pip errors
            ErrorPattern(
                re.compile(r"Could not find a version that satisfies the requirement (.+)"),
                "pip_package_not_found",
                "Pip could not find the package",
                "pip could not find version requirement {0}"
            ),
            # General errors
            ErrorPattern(
                re.compile(r"Timeout"),
                "timeout_error",
                "Operation timed out",
                "command timeout error"
            ),
            ErrorPattern(
                re.compile(r"MemoryError"),
                "memory_error",
                "Process ran out of memory",
                "process memory error"
            ),
            ErrorPattern(
                re.compile(r"Segmentation fault"),
                "segmentation_fault",
                "Segmentation fault (memory access violation)",
                "segmentation fault"
            ),
            # React errors
            ErrorPattern(
                re.compile(r"React Hook .+ is called conditionally"),
                "react_hook_conditional",
                "React Hook called conditionally",
                "react hook called conditionally error",
                "You're using a React Hook inside a conditional statement, but Hooks must be called at the top level of a component function.",
                ["Using a Hook (useState, useEffect, etc.) inside an if statement or loop",
                 "Calling Hooks conditionally breaks React's Hook rules",
                 "Hook call order must be consistent between renders"]
            ),
            ErrorPattern(
                re.compile(r"Element type is invalid: expected a string.*but got: (undefined|null|object)"),
                "react_invalid_element",
                "React invalid element type",
                "react invalid element type error",
                "React couldn't render your component because something that should be a valid React element is invalid.",
                ["A component you're importing doesn't exist or has a different name",
                 "You forgot to export a component",
                 "The component failed during rendering due to an error inside it",
                 "You're using a named import when the component is a default export (or vice versa)"]
            ),
            ErrorPattern(
                re.compile(r"Cannot read propert(?:y|ies) '([^']+)' of (undefined|null)"),
                "js_undefined_property",
                "JavaScript undefined property access",
                "javascript cannot read property {0} of undefined",
                "Your code is trying to access a property of an object that doesn't exist (undefined or null).",
                ["Data hasn't loaded yet (common in React with API calls)",
                 "Typo in property or variable name",
                 "Object structure changed but code wasn't updated",
                 "Missing conditional check before accessing nested properties"]
            ),
            ErrorPattern(
                re.compile(r"Failed to compile.*Module not found: Error: Can't resolve '([^']+)'"),
                "react_module_not_found",
                "React module resolution error",
                "react can't resolve module {0}",
                "The React build process can't find a module or file that your code is trying to import.",
                ["The package isn't installed (run npm install or yarn add)",
                 "There's a typo in the import path",
                 "You're using a relative path that's incorrect",
                 "The file exists but is in a different location than expected"]
            ),
            # Installation errors
            ErrorPattern(
                re.compile(r"npm ERR! code E404"),
                "npm_package_not_found",
                "NPM package not found",
                "npm package not found 404",
                "NPM couldn't find the package you're trying to install. The package name might be misspelled or it may not exist.",
                ["Package name is misspelled", 
                 "Package doesn't exist in the npm registry",
                 "Package was deprecated or removed",
                 "Using a private package without proper authentication"]
            ),
            ErrorPattern(
                re.compile(r"npm ERR! code ENOSELF"),
                "npm_invalid_self_operation",
                "NPM invalid self operation",
                "npm ENOSELF error",
                "You're trying to install a package as a dependency of itself, which isn't allowed.",
                ["Attempting to install a package inside its own directory",
                 "Circular dependency configuration",
                 "Incorrect working directory when running npm commands"]
            ),
            ErrorPattern(
                re.compile(r"npm ERR! code EPERM"),
                "npm_permission_error",
                "NPM permission error",
                "npm permission error EPERM",
                "NPM doesn't have sufficient permissions to complete the operation.",
                ["Trying to install packages globally without admin/sudo privileges",
                 "File/directory permissions issue",
                 "Another process has locked the file/directory",
                 "Antivirus blocking file operations"]
            ),
        ]
        
    def detect_error(self, error_text: str) -> Optional[ErrorPattern]:
        """
        Detect the type of error from the error text.
        
        Args:
            error_text: The error text to analyze
            
        Returns:
            ErrorPattern if a match is found, None otherwise
        """
        # Check against each error pattern
        for pattern in self.patterns:
            match = pattern.pattern.search(error_text)
            if match:
                # If there are capture groups, format the search query with them
                search_query = pattern.search_query
                if match.groups():
                    for i, group in enumerate(match.groups()):
                        search_query = search_query.replace(f"{{{i}}}", group if group else "")
                        
                return pattern
                
        # No recognized error pattern
        return None
        
    def analyze_error(self, command: str, return_code: int, error_text: str) -> ErrorAnalysis:
        """
        Analyze an error and provide initial diagnostic information.
        
        Args:
            command: The command that produced the error
            return_code: The command return code
            error_text: The error text output
            
        Returns:
            ErrorAnalysis with information about the error
        """
        logger.debug(f"Analyzing error from command: {command}")
        
        # Detect error pattern
        error_pattern = self.detect_error(error_text)
        
        if error_pattern:
            # Known error pattern
            error_type = error_pattern.error_type
            description = error_pattern.description
            search_query = error_pattern.search_query
            user_friendly_explanation = error_pattern.user_friendly_explanation
            common_causes = error_pattern.common_causes
            
            # Try to extract additional information from the match
            match = error_pattern.pattern.search(error_text)
            if match and match.groups():
                search_query = error_pattern.search_query
                for i, group in enumerate(match.groups()):
                    search_query = search_query.replace(f"{{{i}}}", group if group else "")
                    
        else:
            # Unknown error
            error_type = "unknown_error"
            description = "Unknown error"
            search_query = f"error {return_code} {' '.join(error_text.split()[:10])}"
            user_friendly_explanation = "This appears to be an error I don't immediately recognize. Let me analyze it further and provide the best explanation I can."
            common_causes = ["The error might be specific to the tool or framework you're using",
                            "It could be a newer error that's not in my pattern database",
                            "The error might be caused by a combination of factors"]
            
        # Create the error analysis
        return ErrorAnalysis(
            error_text=error_text,
            error_type=error_type,
            description=description,
            search_query=search_query,
            user_friendly_explanation=user_friendly_explanation,
            common_causes=common_causes
        )
        
    def get_common_solutions(self, error_type: str) -> List[Dict[str, Any]]:
        """
        Get common solutions for a specific error type.
        
        Args:
            error_type: The type of error
            
        Returns:
            List of potential solutions
        """
        solutions = {
            "python_import_error": [
                {
                    "description": "Install the missing package",
                    "command": "pip install {package_name}",
                    "variables": ["package_name"]
                }
            ],
            "python_module_not_found": [
                {
                    "description": "Install the missing module",
                    "command": "pip install {module_name}",
                    "variables": ["module_name"]
                }
            ],
            "python_syntax_error": [
                {
                    "description": "Check the syntax at the indicated line"
                }
            ],
            "shell_command_not_found": [
                {
                    "description": "Install the missing command",
                    "command": "apt-get install {package_name}  # For Debian/Ubuntu",
                    "variables": ["package_name"]
                },
                {
                    "description": "Check if the command is in your PATH"
                }
            ],
            "file_not_found": [
                {
                    "description": "Create the missing directory",
                    "command": "mkdir -p {directory_path}",
                    "variables": ["directory_path"]
                },
                {
                    "description": "Check the file path and current directory"
                }
            ],
            "permission_denied": [
                {
                    "description": "Change file permissions",
                    "command": "chmod +x {file_path}",
                    "variables": ["file_path"]
                },
                {
                    "description": "Run with sudo (if appropriate)",
                    "command": "sudo {original_command}",
                    "variables": ["original_command"]
                }
            ],
            "git_not_a_repo": [
                {
                    "description": "Initialize a git repository",
                    "command": "git init"
                },
                {
                    "description": "Change to the correct directory"
                }
            ],
            "pip_package_not_found": [
                {
                    "description": "Check the package name spelling",
                },
                {
                    "description": "Try specifying an older version",
                    "command": "pip install {package_name}=={version}",
                    "variables": ["package_name", "version"]
                },
                {
                    "description": "Look for alternative packages"
                }
            ]
        }
        
        return solutions.get(error_type, [
            {
                "description": "Search for the error message online"
            }
        ]) 