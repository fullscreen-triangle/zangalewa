"""
Automatic error resolver that fixes errors without human intervention.
"""

import os
import re
import logging
import subprocess
import tempfile
import time
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from zangalewa.core.errors.detector import ErrorDetector, ErrorAnalysis
from zangalewa.core.errors.resolver import ErrorResolver
from zangalewa.core.executor import CommandExecutor
from zangalewa.core.llm import LLMManager
from zangalewa.core.knowledge import KnowledgeStore

logger = logging.getLogger(__name__)

@dataclass
class ErrorFixResult:
    """Result of an automatic error fix attempt."""
    success: bool
    fix_description: str
    modified_files: List[str]
    commit_hash: Optional[str] = None
    error_type: str = ""
    action_taken: str = ""
    original_error: str = ""
    fix_command: Optional[str] = None
    code_changes: Dict[str, str] = None

class AutoErrorResolver:
    """
    Automatically resolves errors without user intervention whenever possible.
    Uses git to track changes and recovery points.
    """
    
    # Error types that can be automatically fixed
    AUTOFIXABLE_ERRORS = {
        # Missing dependencies
        "python_import_error": "install_dependency",
        "python_module_not_found": "install_dependency",
        "npm_package_not_found": "install_dependency",
        "react_module_not_found": "install_dependency",
        
        # File system errors
        "file_not_found": "create_missing_file_or_dir",
        "permission_denied": "fix_permissions",
        
        # React errors that can be auto-fixed
        "react_hook_conditional": "fix_react_hook",
        "js_undefined_property": "add_null_check",
        
        # Simple syntax errors
        "python_syntax_error": "fix_syntax",
        
        # Git errors
        "git_not_a_repo": "init_git_repo"
    }
    
    def __init__(
        self,
        llm_manager: LLMManager,
        command_executor: CommandExecutor,
        knowledge_store: Optional[KnowledgeStore] = None,
        git_enabled: bool = True,
        project_dir: str = "."
    ):
        """
        Initialize the automatic error resolver.
        
        Args:
            llm_manager: LLM manager for generating code fixes
            command_executor: Command executor for running commands
            knowledge_store: Knowledge store for local lookup
            git_enabled: Whether to use git to track changes
            project_dir: Project directory to operate in
        """
        self.llm_manager = llm_manager
        self.command_executor = command_executor
        self.knowledge_store = knowledge_store
        self.error_resolver = ErrorResolver(llm_manager, command_executor, knowledge_store)
        self.error_detector = ErrorDetector()
        self.git_enabled = git_enabled
        self.project_dir = os.path.abspath(project_dir)
        
        # Initialize git if enabled
        if git_enabled:
            self._ensure_git_repo()
            
    def _ensure_git_repo(self) -> None:
        """Ensure the project directory is a git repository."""
        if not os.path.exists(os.path.join(self.project_dir, ".git")):
            logger.info(f"Initializing git repository in {self.project_dir}")
            subprocess.run(["git", "init"], cwd=self.project_dir, check=True)
            
            # Create initial commit if repo is empty
            subprocess.run(["git", "add", "."], cwd=self.project_dir)
            result = subprocess.run(
                ["git", "commit", "-m", "Initial commit by Zangalewa"],
                cwd=self.project_dir,
                capture_output=True
            )
            if result.returncode != 0 and b"nothing to commit" not in result.stderr:
                logger.warning(f"Failed to create initial commit: {result.stderr.decode()}")
                
    async def handle_error(self, command: str, return_code: int, error_text: str) -> ErrorFixResult:
        """
        Handle an error by trying to fix it automatically.
        
        Args:
            command: The command that produced the error
            return_code: The command return code
            error_text: The error output
            
        Returns:
            Result of the fix attempt
        """
        logger.info(f"Auto-resolving error from command: {command}")
        
        # Create error fix branch if git is enabled
        if self.git_enabled:
            branch_name = f"error-fix-{int(time.time())}"
            self._create_branch(branch_name)
        
        # Analyze the error
        error_analysis = await self.error_resolver.analyze_error(command, return_code, error_text)
        
        # Check if this is an auto-fixable error type
        if error_analysis.error_type in self.AUTOFIXABLE_ERRORS:
            # Get the fix method name
            fix_method_name = self.AUTOFIXABLE_ERRORS[error_analysis.error_type]
            
            # Try to fix the error
            try:
                # Call the appropriate fix method
                fix_method = getattr(self, f"_fix_{fix_method_name}")
                fix_result = await fix_method(command, error_analysis)
                
                # Commit changes if git is enabled and fix was successful
                if self.git_enabled and fix_result.success:
                    commit_message = f"Auto-fix: {fix_result.fix_description}"
                    commit_hash = self._commit_changes(commit_message, fix_result.modified_files)
                    fix_result.commit_hash = commit_hash
                    
                    # Merge the fix branch if successful
                    self._merge_branch(branch_name)
                elif self.git_enabled:
                    # Abandon the branch if fix failed
                    self._abandon_branch(branch_name)
                    
                return fix_result
                
            except Exception as e:
                logger.error(f"Error during auto-fix: {e}")
                
                # Abandon the branch if fix failed
                if self.git_enabled:
                    self._abandon_branch(branch_name)
                    
                return ErrorFixResult(
                    success=False,
                    fix_description=f"Failed to auto-fix error: {str(e)}",
                    modified_files=[],
                    error_type=error_analysis.error_type,
                    original_error=error_text,
                    action_taken="failed_fix_attempt"
                )
        else:
            # Cannot auto-fix this error
            logger.info(f"Error type {error_analysis.error_type} cannot be auto-fixed")
            
            # Abandon the branch if git is enabled
            if self.git_enabled:
                self._abandon_branch(branch_name)
                
            return ErrorFixResult(
                success=False,
                fix_description=f"Cannot auto-fix error type: {error_analysis.error_type}",
                modified_files=[],
                error_type=error_analysis.error_type,
                original_error=error_text,
                action_taken="error_not_auto_fixable"
            )
    
    def _create_branch(self, branch_name: str) -> None:
        """Create a new git branch for error fixing."""
        subprocess.run(["git", "checkout", "-b", branch_name], cwd=self.project_dir, check=True)
        logger.info(f"Created error fix branch: {branch_name}")
        
    def _commit_changes(self, message: str, files: List[str]) -> str:
        """Commit changes to git."""
        # Add the modified files
        for file in files:
            subprocess.run(["git", "add", file], cwd=self.project_dir, check=True)
            
        # Commit the changes
        result = subprocess.run(
            ["git", "commit", "-m", message],
            cwd=self.project_dir,
            capture_output=True,
            check=True
        )
        
        # Get the commit hash
        commit_hash = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=self.project_dir,
            capture_output=True,
            check=True
        ).stdout.decode().strip()
        
        logger.info(f"Committed changes: {commit_hash}")
        return commit_hash
        
    def _merge_branch(self, branch_name: str) -> None:
        """Merge the error fix branch into main."""
        # Get the current branch
        current_branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=self.project_dir,
            capture_output=True,
            check=True
        ).stdout.decode().strip()
        
        # If we're already on a fix branch, checkout main first
        if current_branch.startswith("error-fix-"):
            subprocess.run(["git", "checkout", "main"], cwd=self.project_dir, check=True)
            
        # Merge the fix branch
        subprocess.run(["git", "merge", branch_name], cwd=self.project_dir, check=True)
        logger.info(f"Merged error fix branch: {branch_name}")
        
        # Delete the branch
        subprocess.run(["git", "branch", "-d", branch_name], cwd=self.project_dir, check=True)
        
    def _abandon_branch(self, branch_name: str) -> None:
        """Abandon the error fix branch."""
        # Get the current branch
        current_branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=self.project_dir,
            capture_output=True,
            check=True
        ).stdout.decode().strip()
        
        # If we're on the fix branch, checkout main first
        if current_branch == branch_name:
            subprocess.run(["git", "checkout", "main"], cwd=self.project_dir, check=True)
            
        # Delete the branch
        subprocess.run(["git", "branch", "-D", branch_name], cwd=self.project_dir, check=True)
        logger.info(f"Abandoned error fix branch: {branch_name}")
        
    # Fix methods for different error types
    
    async def _fix_install_dependency(self, command: str, error_analysis: ErrorAnalysis) -> ErrorFixResult:
        """Fix errors related to missing dependencies."""
        error_text = error_analysis.error_text
        
        # Check if this is a Python dependency error
        if "python_" in error_analysis.error_type:
            # Extract the package name
            match = re.search(r"No module named '?([^']+)'?", error_text)
            if match:
                package_name = match.group(1)
                
                # Run pip install
                pip_command = f"pip install {package_name}"
                result = await self.command_executor.execute(pip_command)
                
                if result.success:
                    return ErrorFixResult(
                        success=True,
                        fix_description=f"Installed missing Python package: {package_name}",
                        modified_files=[],
                        error_type=error_analysis.error_type,
                        original_error=error_text,
                        action_taken="installed_dependency",
                        fix_command=pip_command
                    )
                else:
                    return ErrorFixResult(
                        success=False,
                        fix_description=f"Failed to install Python package: {package_name}",
                        modified_files=[],
                        error_type=error_analysis.error_type,
                        original_error=error_text,
                        action_taken="dependency_install_failed",
                        fix_command=pip_command
                    )
                    
        # Check if this is an NPM dependency error
        elif "npm_" in error_analysis.error_type or "react_module_not_found" in error_analysis.error_type:
            # Extract the package name
            if "npm_" in error_analysis.error_type:
                match = re.search(r"'([^']+)(@[^']+)?' is not in the npm registry", error_text)
            else:
                match = re.search(r"Error: Can't resolve '([^']+)'", error_text)
                
            if match:
                package_name = match.group(1)
                
                # Run npm install
                npm_command = f"npm install {package_name}"
                result = await self.command_executor.execute(npm_command)
                
                if result.success:
                    return ErrorFixResult(
                        success=True,
                        fix_description=f"Installed missing NPM package: {package_name}",
                        modified_files=["package.json", "package-lock.json"],
                        error_type=error_analysis.error_type,
                        original_error=error_text,
                        action_taken="installed_dependency",
                        fix_command=npm_command
                    )
                else:
                    return ErrorFixResult(
                        success=False,
                        fix_description=f"Failed to install NPM package: {package_name}",
                        modified_files=[],
                        error_type=error_analysis.error_type,
                        original_error=error_text,
                        action_taken="dependency_install_failed",
                        fix_command=npm_command
                    )
                    
        return ErrorFixResult(
            success=False,
            fix_description="Could not determine dependency to install",
            modified_files=[],
            error_type=error_analysis.error_type,
            original_error=error_text,
            action_taken="dependency_detection_failed"
        )
        
    async def _fix_create_missing_file_or_dir(self, command: str, error_analysis: ErrorAnalysis) -> ErrorFixResult:
        """Fix errors related to missing files or directories."""
        error_text = error_analysis.error_text
        
        # Extract the file or directory path
        match = re.search(r"No such file or directory:? '?([^']+)'?", error_text)
        if match:
            path = match.group(1)
            
            # Check if this is a directory or file
            if path.endswith('/') or '.' not in os.path.basename(path):
                # Create directory
                mkdir_command = f"mkdir -p {path}"
                result = await self.command_executor.execute(mkdir_command)
                
                if result.success:
                    return ErrorFixResult(
                        success=True,
                        fix_description=f"Created missing directory: {path}",
                        modified_files=[path],
                        error_type=error_analysis.error_type,
                        original_error=error_text,
                        action_taken="created_directory",
                        fix_command=mkdir_command
                    )
            else:
                # Create parent directory if needed
                directory = os.path.dirname(path)
                if directory and not os.path.exists(directory):
                    await self.command_executor.execute(f"mkdir -p {directory}")
                    
                # Create empty file
                touch_command = f"touch {path}"
                result = await self.command_executor.execute(touch_command)
                
                if result.success:
                    return ErrorFixResult(
                        success=True,
                        fix_description=f"Created missing file: {path}",
                        modified_files=[path],
                        error_type=error_analysis.error_type,
                        original_error=error_text,
                        action_taken="created_file",
                        fix_command=touch_command
                    )
                    
        return ErrorFixResult(
            success=False,
            fix_description="Could not determine file or directory to create",
            modified_files=[],
            error_type=error_analysis.error_type,
            original_error=error_text,
            action_taken="file_detection_failed"
        )
        
    async def _fix_permissions(self, command: str, error_analysis: ErrorAnalysis) -> ErrorFixResult:
        """Fix permission errors."""
        error_text = error_analysis.error_text
        
        # Extract the file or directory path
        match = re.search(r"Permission denied:? '?([^']+)'?", error_text)
        if match:
            path = match.group(1)
            
            # Fix permissions
            chmod_command = f"chmod +x {path}" if os.path.isfile(path) else f"chmod -R 755 {path}"
            result = await self.command_executor.execute(chmod_command)
            
            if result.success:
                return ErrorFixResult(
                    success=True,
                    fix_description=f"Fixed permissions for: {path}",
                    modified_files=[path],
                    error_type=error_analysis.error_type,
                    original_error=error_text,
                    action_taken="fixed_permissions",
                    fix_command=chmod_command
                )
                
        return ErrorFixResult(
            success=False,
            fix_description="Could not determine path to fix permissions",
            modified_files=[],
            error_type=error_analysis.error_type,
            original_error=error_text,
            action_taken="permission_fix_failed"
        )
        
    async def _fix_react_hook(self, command: str, error_analysis: ErrorAnalysis) -> ErrorFixResult:
        """Fix React Hook errors."""
        error_text = error_analysis.error_text
        
        # Find the file and line number
        file_match = re.search(r"File: ([^\n]+):(\d+)", error_text)
        if file_match:
            file_path = file_match.group(1)
            line_number = int(file_match.group(2))
            
            # Read the file content
            with open(file_path, 'r') as file:
                lines = file.readlines()
                
            # Find the hook call inside conditional
            hook_match = None
            condition_line = None
            hook_line = None
            
            for i in range(line_number, min(line_number + 10, len(lines))):
                if re.search(r"if\s*\(|for\s*\(|while\s*\(", lines[i]):
                    condition_line = i
                if re.search(r"use[A-Z]\w+\s*\(", lines[i]) and condition_line is not None:
                    hook_line = i
                    hook_match = re.search(r"(const\s+\[.+?\]\s*=\s*)?(use[A-Z]\w+\s*\(.+?\))", lines[i])
                    break
                    
            if hook_match and condition_line is not None and hook_line is not None:
                hook_call = hook_match.group(2)
                variable_def = hook_match.group(1) or ""
                
                # Move the hook call outside the conditional
                new_lines = lines.copy()
                
                # Remove the hook from inside the conditional
                new_lines[hook_line] = new_lines[hook_line].replace(variable_def + hook_call, "")
                
                # Add the hook before the conditional
                new_lines.insert(condition_line, " " * (len(new_lines[condition_line]) - len(new_lines[condition_line].lstrip())) + variable_def + hook_call + ";\n")
                
                # Write back to the file
                with open(file_path, 'w') as file:
                    file.writelines(new_lines)
                    
                return ErrorFixResult(
                    success=True,
                    fix_description=f"Fixed React Hook conditional call in {file_path}",
                    modified_files=[file_path],
                    error_type=error_analysis.error_type,
                    original_error=error_text,
                    action_taken="fixed_react_hook",
                    code_changes={file_path: "Moved React Hook call outside conditional"}
                )
                
        return ErrorFixResult(
            success=False,
            fix_description="Could not locate React Hook in conditional",
            modified_files=[],
            error_type=error_analysis.error_type,
            original_error=error_text,
            action_taken="react_hook_fix_failed"
        )
        
    async def _fix_add_null_check(self, command: str, error_analysis: ErrorAnalysis) -> ErrorFixResult:
        """Fix undefined property access errors."""
        error_text = error_analysis.error_text
        
        # Extract property and file info
        prop_match = re.search(r"Cannot read propert(?:y|ies) '([^']+)' of (undefined|null)", error_text)
        file_match = re.search(r"at\s+([^:]+):(\d+):(\d+)", error_text)
        
        if prop_match and file_match:
            property_name = prop_match.group(1)
            file_path = file_match.group(1)
            line_number = int(file_match.group(2))
            
            # Read the file content
            with open(file_path, 'r') as file:
                lines = file.readlines()
                
            # Find the property access
            for i in range(max(0, line_number - 5), min(line_number + 5, len(lines))):
                if property_name in lines[i]:
                    # Analyze the line to find the object being accessed
                    parts = re.split(r'[\.\[]', lines[i])
                    object_chain = []
                    
                    for part in parts:
                        if property_name in part:
                            break
                        if part.strip() and not part.strip().startswith(('(', ')', '{', '}', ';')):
                            clean_part = re.sub(r'[^a-zA-Z0-9_]', '', part.strip())
                            if clean_part:
                                object_chain.append(clean_part)
                                
                    if object_chain:
                        # Build the object chain for the conditional
                        object_access = '.'.join(object_chain)
                        
                        # Add a null check
                        indentation = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
                        new_line = f"{indentation}if ({object_access}) {{\n{lines[i]}{indentation}}}\n"
                        
                        # Update the file
                        new_lines = lines.copy()
                        new_lines[i] = new_line
                        
                        with open(file_path, 'w') as file:
                            file.writelines(new_lines)
                            
                        return ErrorFixResult(
                            success=True,
                            fix_description=f"Added null check for '{object_access}.{property_name}' in {file_path}",
                            modified_files=[file_path],
                            error_type=error_analysis.error_type,
                            original_error=error_text,
                            action_taken="added_null_check",
                            code_changes={file_path: f"Added null check for {object_access}"}
                        )
                        
        return ErrorFixResult(
            success=False,
            fix_description="Could not locate property access to add null check",
            modified_files=[],
            error_type=error_analysis.error_type,
            original_error=error_text,
            action_taken="null_check_fix_failed"
        )
        
    async def _fix_syntax(self, command: str, error_analysis: ErrorAnalysis) -> ErrorFixResult:
        """Fix basic syntax errors using LLM."""
        error_text = error_analysis.error_text
        
        # Extract file and line number
        file_match = re.search(r"File \"([^\"]+)\", line (\d+)", error_text)
        
        if file_match:
            file_path = file_match.group(1)
            line_number = int(file_match.group(2))
            
            # Read the file content
            with open(file_path, 'r') as file:
                content = file.read()
                
            # Prepare context for LLM
            context = f"""
            Fix the syntax error in this Python file:
            
            Error:
            {error_text}
            
            File content:
            {content}
            
            The error is on line {line_number}.
            
            Please provide only the fixed file content. Do not include explanations.
            """
            
            # Ask LLM to fix the syntax
            response = await self.llm_manager.generate_text(
                context,
                temperature=0.2,
                max_tokens=len(content) + 500
            )
            
            if response:
                # Extract code from response
                code_match = re.search(r"```(?:python)?\n(.*?)```", response, re.DOTALL)
                fixed_content = code_match.group(1) if code_match else response
                
                # Write the fixed code back to the file
                with open(file_path, 'w') as file:
                    file.write(fixed_content)
                    
                return ErrorFixResult(
                    success=True,
                    fix_description=f"Fixed syntax error in {file_path} on line {line_number}",
                    modified_files=[file_path],
                    error_type=error_analysis.error_type,
                    original_error=error_text,
                    action_taken="fixed_syntax_error",
                    code_changes={file_path: "Fixed syntax error"}
                )
                
        return ErrorFixResult(
            success=False,
            fix_description="Could not fix syntax error",
            modified_files=[],
            error_type=error_analysis.error_type,
            original_error=error_text,
            action_taken="syntax_fix_failed"
        )
        
    async def _fix_init_git_repo(self, command: str, error_analysis: ErrorAnalysis) -> ErrorFixResult:
        """Fix git repository not found errors."""
        git_command = "git init"
        result = await self.command_executor.execute(git_command)
        
        if result.success:
            return ErrorFixResult(
                success=True,
                fix_description="Initialized git repository",
                modified_files=[".git"],
                error_type=error_analysis.error_type,
                original_error=error_analysis.error_text,
                action_taken="initialized_git_repo",
                fix_command=git_command
            )
            
        return ErrorFixResult(
            success=False,
            fix_description="Failed to initialize git repository",
            modified_files=[],
            error_type=error_analysis.error_type,
            original_error=error_analysis.error_text,
            action_taken="git_init_failed",
            fix_command=git_command
        ) 