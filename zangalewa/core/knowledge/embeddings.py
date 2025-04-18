"""
Embedding generator for creating vector representations of text.
"""

import logging
import numpy as np
from typing import List, Optional, Union, Dict, Any
import openai
from tenacity import retry, stop_after_attempt, wait_random_exponential

from zangalewa.utils.config import get_config

logger = logging.getLogger(__name__)

class EmbeddingGenerator:
    """
    Generates vector embeddings for text using OpenAI models.
    """
    
    def __init__(self):
        """Initialize the embedding generator."""
        self.config = get_config()
        self.openai_api_key = self.config.get("OPENAI_API_KEY")
        self.embedding_model = self.config.get("EMBEDDING_MODEL", "text-embedding-ada-002")
        self.embedding_dimension = 1536  # Default for OpenAI embeddings
        self.client = None
        
        if self.openai_api_key:
            self.client = openai.OpenAI(api_key=self.openai_api_key)
            logger.info(f"Initialized embedding generator with model {self.embedding_model}")
        else:
            logger.warning("No OpenAI API key found, embedding generation will be simulated")
            
    @retry(wait=wait_random_exponential(min=1, max=20), stop=stop_after_attempt(6))
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding vector for a text string.
        
        Args:
            text: The text to convert to an embedding
            
        Returns:
            List of floats representing the embedding vector
        """
        if not self.client:
            # Return a random vector if no API key is available
            return self._generate_random_embedding()
            
        try:
            response = await self.client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            # Fall back to random vector on error
            return self._generate_random_embedding()
            
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to convert to embeddings
            
        Returns:
            List of embedding vectors
        """
        if not self.client:
            # Return random vectors if no API key is available
            return [self._generate_random_embedding() for _ in texts]
            
        try:
            response = await self.client.embeddings.create(
                model=self.embedding_model,
                input=texts
            )
            
            return [item.embedding for item in response.data]
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            # Fall back to random vectors on error
            return [self._generate_random_embedding() for _ in texts]
            
    def _generate_random_embedding(self) -> List[float]:
        """Generate a random embedding vector for testing."""
        # Create a random vector with the same dimension as the model
        random_vector = np.random.normal(0, 0.1, self.embedding_dimension)
        # Normalize to unit length
        normalized = random_vector / np.linalg.norm(random_vector)
        return normalized.tolist()
        
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity (0-1 where 1 is most similar)
        """
        # Convert to numpy arrays
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return dot_product / (norm1 * norm2) 