"""
Knowledge query system for searching and retrieving information.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple

from zangalewa.core.knowledge.store import KnowledgeStore, KnowledgeItem
from zangalewa.core.llm import LLMManager

logger = logging.getLogger(__name__)

class KnowledgeQuery:
    """
    Query system for retrieving and processing knowledge.
    """
    
    def __init__(self, knowledge_store: KnowledgeStore, llm_manager: Optional[LLMManager] = None):
        """
        Initialize the knowledge query system.
        
        Args:
            knowledge_store: Knowledge store to query
            llm_manager: LLM manager for enhancing query results
        """
        self.knowledge_store = knowledge_store
        self.llm_manager = llm_manager
        
    async def query(self, query_text: str, top_k: int = 5) -> List[KnowledgeItem]:
        """
        Search the knowledge store for items relevant to the query.
        
        Args:
            query_text: The query text
            top_k: Maximum number of results to return
            
        Returns:
            List of KnowledgeItem objects
        """
        return await self.knowledge_store.search(query_text, top_k)
        
    async def query_with_metadata_filter(
        self, 
        query_text: str, 
        metadata_filter: Dict[str, Any], 
        top_k: int = 5
    ) -> List[KnowledgeItem]:
        """
        Search with additional metadata filtering.
        
        Args:
            query_text: The query text
            metadata_filter: Dictionary of metadata fields to filter by
            top_k: Maximum number of results (before filtering)
            
        Returns:
            List of KnowledgeItem objects that match the filter
        """
        # First get results based on semantic similarity
        results = await self.knowledge_store.search(query_text, top_k * 2)  # Get more results to account for filtering
        
        # Then filter by metadata
        filtered_results = []
        for item in results:
            matches = True
            for key, value in metadata_filter.items():
                if key not in item.metadata or item.metadata[key] != value:
                    matches = False
                    break
                    
            if matches:
                filtered_results.append(item)
                if len(filtered_results) >= top_k:
                    break
                    
        return filtered_results
        
    async def ask(self, question: str, context_size: int = 5) -> str:
        """
        Ask a question and get an answer based on knowledge store contents.
        
        Args:
            question: The question to ask
            context_size: Number of knowledge items to include as context
            
        Returns:
            Answer generated from the knowledge
        """
        if not self.llm_manager:
            logger.error("Cannot generate answer without LLM manager")
            return "Error: LLM manager not available"
            
        # Retrieve relevant knowledge items
        items = await self.query(question, context_size)
        
        if not items:
            return "I don't have any information about that."
            
        # Prepare context from retrieved items
        context = "\n\n".join([
            f"Source {i+1}:\n{item.content}" 
            for i, item in enumerate(items)
        ])
        
        # Generate an answer using the LLM
        system_prompt = """
        You are an assistant that answers questions based on the provided knowledge base excerpts.
        Use only the information from the provided sources to answer the question.
        If the sources don't contain the answer, say that you don't have enough information.
        Always cite which source(s) you used in your answer.
        """
        
        messages = [
            {"role": "user", "content": f"I need information about the following question:\n\n{question}\n\nHere are the relevant knowledge base excerpts:\n\n{context}"}
        ]
        
        answer = await self.llm_manager.generate_response(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=1000
        )
        
        return answer
        
    async def summarize_items(self, items: List[KnowledgeItem]) -> str:
        """
        Generate a summary of multiple knowledge items.
        
        Args:
            items: List of knowledge items to summarize
            
        Returns:
            Summary text
        """
        if not self.llm_manager:
            logger.error("Cannot generate summary without LLM manager")
            return "Error: LLM manager not available"
            
        if not items:
            return "No items to summarize."
            
        # Prepare content from items
        content = "\n\n".join([
            f"Item {i+1}:\n{item.content}" 
            for i, item in enumerate(items)
        ])
        
        # Generate a summary using the LLM
        system_prompt = """
        You are an assistant that summarizes information from multiple sources.
        Provide a concise but comprehensive summary of the provided content.
        Focus on key points, common themes, and important details.
        """
        
        messages = [
            {"role": "user", "content": f"Please summarize the following information:\n\n{content}"}
        ]
        
        summary = await self.llm_manager.generate_response(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=1000
        )
        
        return summary 