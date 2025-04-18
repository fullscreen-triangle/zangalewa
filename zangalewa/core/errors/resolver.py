"""
Error resolver for finding and applying solutions to errors.
"""

import logging
import re
import os
import json
from typing import Dict, List, Any, Optional, Tuple

from zangalewa.core.errors.detector import ErrorDetector, ErrorAnalysis
from zangalewa.core.errors.search import ErrorSearcher
from zangalewa.core.executor import CommandExecutor
from zangalewa.core.llm import LLMManager
from zangalewa.core.knowledge import KnowledgeStore

logger = logging.getLogger(__name__)

class ErrorResolver:
    """
    Resolves errors by searching for solutions and recommending fixes.
    """
    
    def __init__(
        self, 
        llm_manager: Optional[LLMManager] = None,
        command_executor: Optional[CommandExecutor] = None,
        knowledge_store: Optional[KnowledgeStore] = None
    ):
        """
        Initialize the error resolver.
        
        Args:
            llm_manager: LLM manager for generating solutions
            command_executor: Command executor for testing solutions
            knowledge_store: Knowledge store for local lookup
        """
        self.error_detector = ErrorDetector()
        self.error_searcher = ErrorSearcher()
        self.llm_manager = llm_manager
        self.command_executor = command_executor
        self.knowledge_store = knowledge_store
        
    async def analyze_error(self, command: str, return_code: int, error_text: str) -> ErrorAnalysis:
        """
        Analyze an error and find potential solutions.
        
        Args:
            command: The command that caused the error
            return_code: The command return code
            error_text: The error output text
            
        Returns:
            ErrorAnalysis object with diagnostic info and solutions
        """
        logger.info(f"Analyzing error for command: {command}")
        
        # Use the error detector to analyze the error
        error_analysis = self.error_detector.analyze_error(command, return_code, error_text)
        
        # Get common solutions for this error type
        solutions = self.error_detector.get_common_solutions(error_analysis.error_type)
        
        # Set variable values if possible
        solutions = await self._fill_solution_variables(solutions, command, error_text)
        
        # Update the analysis with solutions
        error_analysis.solutions = solutions
        
        # Search for additional solutions
        if self.error_searcher:
            error_analysis = await self._search_for_solutions(error_analysis)
            
        return error_analysis
    
    async def explain_error_to_user(self, error_analysis: ErrorAnalysis, code_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate a user-friendly explanation of the error with context-aware details.
        
        Args:
            error_analysis: The error analysis results
            code_context: Optional context about the codebase (relevant files, structures, etc.)
            
        Returns:
            Dictionary containing the explanation and related information
        """
        explanation = {
            "title": f"Error: {error_analysis.description}",
            "explanation": error_analysis.user_friendly_explanation,
            "common_causes": error_analysis.common_causes,
            "solutions": [],
            "context_specific_info": "",
            "is_common_error": True if error_analysis.error_type != "unknown_error" else False
        }
        
        # Add context-specific information if there's code context
        if code_context:
            explanation["context_specific_info"] = await self._generate_context_specific_explanation(
                error_analysis, code_context
            )
            
        # Include top solutions
        for solution in error_analysis.solutions[:3]:  # Top 3 solutions
            explanation["solutions"].append({
                "description": solution.get("description", ""),
                "action": solution.get("command", "") if "command" in solution else "See explanation",
                "confidence": solution.get("confidence", "medium")
            })
            
        # If using LLM, get enhanced explanation
        if self.llm_manager:
            enhanced_explanation = await self._generate_enhanced_explanation(error_analysis)
            if enhanced_explanation:
                explanation["explanation"] = enhanced_explanation
                
        return explanation
    
    async def _generate_context_specific_explanation(
        self, 
        error_analysis: ErrorAnalysis, 
        code_context: Dict[str, Any]
    ) -> str:
        """
        Generate explanation specific to the user's code context.
        
        Args:
            error_analysis: The error analysis
            code_context: Information about the user's code
            
        Returns:
            Context-specific explanation
        """
        context_info = ""
        
        # Extract error type and patterns from the error
        error_type = error_analysis.error_type
        error_text = error_analysis.error_text
        
        # React-specific context handling
        if "react" in error_type or "React" in error_text:
            # Handle React component errors
            if "component" in code_context:
                component_name = code_context.get("component", {}).get("name", "")
                if component_name:
                    context_info += f"This error occurred in your React component '{component_name}'. "
                    
                    # For invalid element errors
                    if error_type == "react_invalid_element":
                        imports = code_context.get("component", {}).get("imports", [])
                        missing_imports = []
                        
                        # Check for potential missing imports
                        for match in re.finditer(r"Element type is invalid: expected .* got: undefined", error_text):
                            component_match = re.search(r"<([A-Z][a-zA-Z0-9]+)", error_text)
                            if component_match and component_match.group(1) not in imports:
                                missing_imports.append(component_match.group(1))
                                
                        if missing_imports:
                            context_info += f"You might be missing imports for: {', '.join(missing_imports)}. "
                            
                # For hook errors
                if error_type == "react_hook_conditional":
                    hooks_in_conditionals = code_context.get("component", {}).get("hooks_in_conditionals", [])
                    if hooks_in_conditionals:
                        context_info += (f"You have React Hooks inside conditional statements at " 
                                       f"lines: {', '.join(str(line) for line in hooks_in_conditionals)}. "
                                       f"Hooks must be at the top level of your component. ")
        
        # Python-specific context handling
        elif "python" in error_type:
            # Check for import errors
            if "python_import_error" in error_type or "python_module_not_found" in error_type:
                module_match = re.search(r"No module named '?([^']+)'?", error_text)
                if module_match:
                    module_name = module_match.group(1)
                    
                    # Check if it's a typo of an existing import
                    existing_imports = code_context.get("imports", [])
                    for existing in existing_imports:
                        if self._is_similar_name(module_name, existing):
                            context_info += f"The module '{module_name}' might be a typo of '{existing}'. "
                            break
                    
                    # Check virtual environment
                    if "venv" in code_context:
                        venv_path = code_context.get("venv", {}).get("path", "")
                        if venv_path:
                            context_info += (f"You're using a virtual environment at '{venv_path}'. "
                                           f"Make sure you've installed '{module_name}' in this environment. ")
        
        # General file and permission context
        if error_type == "file_not_found":
            # Check for similar file names
            file_match = re.search(r"No such file or directory: '?([^']+)'?", error_text)
            if file_match:
                target_file = file_match.group(1)
                similar_files = []
                
                if "files" in code_context:
                    for file in code_context.get("files", []):
                        if self._is_similar_name(os.path.basename(target_file), os.path.basename(file)):
                            similar_files.append(file)
                            
                if similar_files:
                    context_info += f"Did you mean one of these files instead? {', '.join(similar_files)}. "
        
        return context_info
    
    def _is_similar_name(self, name1: str, name2: str) -> bool:
        """Check if two names are similar (potential typos)."""
        if name1 == name2:
            return False  # Exact match isn't what we're looking for
            
        # Simple edit distance check (Levenshtein distance would be better)
        if abs(len(name1) - len(name2)) <= 2:
            # Count differences
            diff = 0
            for c1, c2 in zip(name1[:min(len(name1), len(name2))], name2[:min(len(name1), len(name2))]):
                if c1 != c2:
                    diff += 1
            
            return diff <= 2
            
        return False
    
    async def _generate_enhanced_explanation(self, error_analysis: ErrorAnalysis) -> Optional[str]:
        """
        Generate an enhanced explanation of the error using the LLM.
        
        Args:
            error_analysis: The error analysis
            
        Returns:
            Enhanced explanation or None if LLM is not available
        """
        if not self.llm_manager:
            return None
            
        # Prepare context from error analysis and search results
        error_context = f"""
        Error type: {error_analysis.error_type}
        Error description: {error_analysis.description}
        Error message:
        ```
        {error_analysis.error_text}
        ```
        """
        
        # Add information from search results if available
        if error_analysis.sources:
            error_context += "\nInformation from search results:\n"
            for i, source in enumerate(error_analysis.sources[:3]):  # Use top 3 sources
                error_context += f"\nSource {i+1}: {source['title']}\n"
                error_context += f"{source['snippet']}\n"
                
        # Create prompt for LLM
        prompt = f"""
        You are an expert at explaining technical errors in a way that's easy to understand.
        
        Please explain the following error in plain language that a developer would understand. Focus on:
        1. What the error means in simple terms
        2. The most likely causes of this error
        3. How serious the error is (cosmetic, minor, severe, etc.)
        
        Keep your explanation conversational, helpful, and under 200 words.
        
        {error_context}
        """
        
        try:
            # Generate explanation using LLM
            response = await self.llm_manager.generate_text(
                prompt,
                temperature=0.3,  # Lower temperature for more factual response
                max_tokens=300
            )
            
            return response.strip() if response else None
            
        except Exception as e:
            logger.error(f"Error generating enhanced explanation: {e}")
            return None
        
    async def _fill_solution_variables(
        self, 
        solutions: List[Dict[str, Any]], 
        command: str, 
        error_text: str
    ) -> List[Dict[str, Any]]:
        """
        Fill in variables in solution templates based on error context.
        
        Args:
            solutions: List of solution templates
            command: The original command
            error_text: The error text
            
        Returns:
            Solutions with variables filled in
        """
        updated_solutions = []
        
        for solution in solutions:
            # Copy the solution to modify
            updated_solution = solution.copy()
            
            # Skip if no command template or variables
            if "command" not in updated_solution or "variables" not in updated_solution:
                updated_solutions.append(updated_solution)
                continue
                
            command_template = updated_solution["command"]
            variables = updated_solution.get("variables", [])
            
            # Fill in known variables
            if "original_command" in variables:
                command_template = command_template.replace("{original_command}", command)
                
            # Extract information from error text for other variables
            for var in variables:
                if var == "original_command":
                    continue
                    
                # Try to extract variable values based on type
                if var == "package_name" or var == "module_name":
                    # Look for module/package names in import errors
                    match = re.search(r"No module named '?([^']+)'?", error_text)
                    if match:
                        command_template = command_template.replace(f"{{{var}}}", match.group(1))
                        
                elif var == "file_path":
                    # Look for file paths in errors
                    match = re.search(r"'([^']*\.[\w]+)'", error_text)
                    if match:
                        command_template = command_template.replace(f"{{{var}}}", match.group(1))
                        
                elif var == "directory_path":
                    # Look for directory paths in errors
                    match = re.search(r"No such file or directory: '([^']+)'", error_text)
                    if match:
                        command_template = command_template.replace(f"{{{var}}}", match.group(1))
                        
                # React/JS specific variables
                elif var == "npm_package":
                    # Look for NPM package names
                    match = re.search(r"Error: Can't resolve '([^']+)'", error_text)
                    if match:
                        command_template = command_template.replace(f"{{{var}}}", match.group(1))
                        
                elif var == "component_name":
                    # Look for React component names
                    match = re.search(r"Element type is invalid: expected .* for <([A-Z][a-zA-Z0-9]+)", error_text)
                    if match:
                        command_template = command_template.replace(f"{{{var}}}", match.group(1))
                        
            # Update the command in the solution
            updated_solution["command"] = command_template
            updated_solutions.append(updated_solution)
            
        return updated_solutions
        
    async def _search_for_solutions(self, error_analysis: ErrorAnalysis) -> ErrorAnalysis:
        """
        Search for solutions to the error.
        
        Args:
            error_analysis: The current error analysis
            
        Returns:
            Updated error analysis with search results
        """
        # Search knowledge base if available
        knowledge_results = []
        if self.knowledge_store:
            knowledge_results = await self.error_searcher.search_knowledge_base(
                error_analysis.search_query, 
                self.knowledge_store
            )
            
        # Search online
        online_results = await self.error_searcher.search_error(
            error_analysis.search_query
        )
        
        # Combine sources
        error_analysis.sources = knowledge_results + online_results
        
        # Generate LLM solutions if available
        if self.llm_manager:
            llm_solutions = await self._generate_solutions(error_analysis)
            # Add LLM solutions at the beginning
            error_analysis.solutions = llm_solutions + error_analysis.solutions
            
        return error_analysis
        
    async def _generate_solutions(self, error_analysis: ErrorAnalysis) -> List[Dict[str, Any]]:
        """
        Generate solutions using LLM.
        
        Args:
            error_analysis: The error analysis
            
        Returns:
            List of solution dictionaries
        """
        if not self.llm_manager:
            return []
            
        # Prepare context from search results
        context = ""
        if error_analysis.sources:
            context = "Relevant information:\n\n"
            for i, source in enumerate(error_analysis.sources[:3]):  # Use top 3 sources
                context += f"Source {i+1}: {source['title']}\n"
                context += f"{source['snippet']}\n\n"
                
        # Create prompt for the LLM
        system_prompt = """
        You are an expert at solving technical errors. Analyze the error and suggest practical solutions.
        For each solution:
        1. Provide a clear description of what to do
        2. Include the exact command to run if applicable
        3. Explain why this solution should work
        
        Provide solutions in this format:
        SOLUTION 1:
        DESCRIPTION: Brief description of the solution
        COMMAND: command to run (if applicable)
        EXPLANATION: Why this solution should work
        
        SOLUTION 2:
        ...and so on
        """
        
        user_prompt = f"""
        Error type: {error_analysis.error_type}
        Error message:
        ```
        {error_analysis.error_text}
        ```
        
        {context}
        
        Please provide 1-3 practical solutions for this error.
        """
        
        try:
            # Generate solutions using LLM
            response = await self.llm_manager.generate_text(
                user_prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.2,  # Lower temperature for more consistent results
                max_tokens=800
            )
            
            # Parse solutions from the response
            solutions = self._extract_solutions_from_text(response)
            
            return solutions
            
        except Exception as e:
            logger.error(f"Error generating solutions: {e}")
            return []
            
    def _extract_solutions_from_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract structured solutions from LLM-generated text.
        
        Args:
            text: The LLM response text
            
        Returns:
            List of solution dictionaries
        """
        solutions = []
        
        # Split the text into solution blocks
        solution_blocks = re.split(r"SOLUTION \d+:", text)
        if len(solution_blocks) <= 1:
            # Try alternative format
            solution_blocks = re.split(r"Solution \d+:", text)
            
        # Skip the first block if it's empty or just contains whitespace
        if solution_blocks and not solution_blocks[0].strip():
            solution_blocks = solution_blocks[1:]
            
        # Parse each solution block
        for block in solution_blocks:
            if not block.strip():
                continue
                
            solution = {}
            
            # Extract description
            description_match = re.search(r"DESCRIPTION:(.*?)(?:COMMAND:|EXPLANATION:|$)", block, re.DOTALL)
            if description_match:
                solution["description"] = description_match.group(1).strip()
            else:
                # Try alternative format
                description_match = re.search(r"Description:(.*?)(?:Command:|Explanation:|$)", block, re.DOTALL)
                if description_match:
                    solution["description"] = description_match.group(1).strip()
                    
            # Extract command
            command_match = re.search(r"COMMAND:(.*?)(?:EXPLANATION:|$)", block, re.DOTALL)
            if command_match and command_match.group(1).strip():
                solution["command"] = command_match.group(1).strip()
            else:
                # Try alternative format
                command_match = re.search(r"Command:(.*?)(?:Explanation:|$)", block, re.DOTALL)
                if command_match and command_match.group(1).strip():
                    solution["command"] = command_match.group(1).strip()
                    
            # Extract explanation
            explanation_match = re.search(r"EXPLANATION:(.*?)(?:SOLUTION \d+:|$)", block, re.DOTALL)
            if explanation_match:
                solution["explanation"] = explanation_match.group(1).strip()
            else:
                # Try alternative format
                explanation_match = re.search(r"Explanation:(.*?)(?:Solution \d+:|$)", block, re.DOTALL)
                if explanation_match:
                    solution["explanation"] = explanation_match.group(1).strip()
                    
            # Add the solution if it has at least a description
            if "description" in solution:
                # Set a default confidence level
                solution["confidence"] = "medium"
                solutions.append(solution)
                
        return solutions
        
    async def test_solution(self, solution: Dict[str, Any], cwd: Optional[str] = None) -> Dict[str, Any]:
        """
        Test if a solution actually works.
        
        Args:
            solution: The solution to test
            cwd: Current working directory
            
        Returns:
            Result of the solution test
        """
        if not self.command_executor or "command" not in solution:
            return {"tested": False, "success": False, "reason": "No command executor or no command in solution"}
            
        try:
            command = solution["command"]
            
            # Don't execute potentially dangerous commands
            if any(danger in command for danger in [
                "rm -rf", "mkfs", "dd if=/dev/zero", "> /dev/sda", "chmod -R 777 /"
            ]):
                return {
                    "tested": False, 
                    "success": False, 
                    "reason": "Command looks potentially dangerous"
                }
                
            # Check for missing variables in command template
            if re.search(r'\{[^}]+\}', command):
                return {
                    "tested": False,
                    "success": False,
                    "reason": "Command contains unfilled variables"
                }
                
            # Execute the command
            result = await self.command_executor.execute(command, cwd=cwd)
            
            return {
                "tested": True,
                "success": result.success,
                "return_code": result.return_code,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
            
        except Exception as e:
            return {
                "tested": True,
                "success": False,
                "reason": f"Error testing solution: {str(e)}"
            }
            
    async def rank_solutions(self, error_analysis: ErrorAnalysis) -> ErrorAnalysis:
        """
        Rank solutions based on likelihood of success.
        
        Args:
            error_analysis: The error analysis with solutions
            
        Returns:
            Error analysis with ranked solutions
        """
        # Use LLM to rank solutions if available
        if self.llm_manager and len(error_analysis.solutions) > 1:
            ranked_solutions = await self._rank_with_llm(error_analysis)
            if ranked_solutions:
                error_analysis.solutions = ranked_solutions
                
        return error_analysis
        
    async def _rank_with_llm(self, error_analysis: ErrorAnalysis) -> List[Dict[str, Any]]:
        """Rank solutions using LLM."""
        system_prompt = """
        You are an expert at analyzing technical solutions. Rank the provided solutions
        for the given error based on:
        1. Likelihood of fixing the specific error
        2. Safety of the solution
        3. Simplicity and ease of implementation
        
        Return the solutions in ranked order (best first) with a confidence score (0-100).
        """
        
        solutions_text = "\n\n".join([
            f"Solution {i+1}: {solution['description']}\n" + 
            (f"Command: {solution['command']}\n" if 'command' in solution else "")
            for i, solution in enumerate(error_analysis.solutions)
        ])
        
        error_info = f"""
        Error type: {error_analysis.error_type}
        Description: {error_analysis.description}
        
        Error text:
        {error_analysis.error_text}
        
        Proposed solutions:
        {solutions_text}
        """
        
        messages = [
            {"role": "user", "content": f"Please rank these solutions for the error:\n\n{error_info}"}
        ]
        
        try:
            response = await self.llm_manager.generate_response(
                messages=messages,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=1000
            )
            
            # Extract the ranking
            ranked_indices = []
            for i, solution in enumerate(error_analysis.solutions):
                match = re.search(rf'Solution\s+(\d+)', response)
                if match:
                    index = int(match.group(1)) - 1
                    if 0 <= index < len(error_analysis.solutions):
                        ranked_indices.append(index)
                        
            # If we found a ranking, reorder solutions
            if ranked_indices:
                # Add any solutions not explicitly ranked to the end
                all_indices = set(range(len(error_analysis.solutions)))
                missing_indices = all_indices - set(ranked_indices)
                ranked_indices.extend(missing_indices)
                
                # Reorder solutions
                return [error_analysis.solutions[i] for i in ranked_indices]
                
        except Exception as e:
            logger.error(f"Error ranking solutions: {e}")
            
        return error_analysis.solutions 