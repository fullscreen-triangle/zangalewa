"""
Knowledge store for managing structured and unstructured information.
"""

import os
import json
import logging
import time
import sqlite3
import faiss
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Tuple
from sqlitedict import SqliteDict
from dataclasses import dataclass, field

from zangalewa.core.knowledge.embeddings import EmbeddingGenerator
from zangalewa.utils.config import get_config

logger = logging.getLogger(__name__)

@dataclass
class KnowledgeItem:
    """A single item in the knowledge base."""
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[List[float]] = None
    item_id: Optional[str] = None
    timestamp: float = field(default_factory=time.time)


class KnowledgeStore:
    """
    Store for managing knowledge items with vector search capabilities.
    """
    
    def __init__(self, store_dir: Optional[str] = None):
        """
        Initialize the knowledge store.
        
        Args:
            store_dir: Directory to store knowledge base files
        """
        self.config = get_config()
        self.embedding_generator = EmbeddingGenerator()
        self.embedding_dimension = self.embedding_generator.embedding_dimension
        
        # Set up storage directory
        if store_dir is None:
            store_dir = os.path.join(str(Path.home()), ".zangalewa", "knowledge")
        
        self.store_dir = store_dir
        os.makedirs(store_dir, exist_ok=True)
        
        # Initialize SQLite storage for metadata
        self.db_path = os.path.join(store_dir, "knowledge.sqlite")
        self.db = SqliteDict(self.db_path, tablename="knowledge", autocommit=True)
        
        # Initialize vector index
        self.index_path = os.path.join(store_dir, "knowledge.index")
        self.index = self._load_or_create_index()
        
        logger.info(f"Knowledge store initialized at {store_dir}")
        
    def _load_or_create_index(self) -> faiss.Index:
        """Load existing index or create a new one."""
        try:
            if os.path.exists(self.index_path):
                logger.info(f"Loading existing knowledge index from {self.index_path}")
                return faiss.read_index(self.index_path)
            else:
                logger.info("Creating new knowledge index")
                index = faiss.IndexFlatL2(self.embedding_dimension)
                return index
        except Exception as e:
            logger.error(f"Error loading index, creating new one: {e}")
            return faiss.IndexFlatL2(self.embedding_dimension)
            
    async def add_item(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Add an item to the knowledge store.
        
        Args:
            content: The content text
            metadata: Additional metadata about the content
            
        Returns:
            ID of the added item
        """
        if metadata is None:
            metadata = {}
            
        # Generate a unique ID
        item_id = f"item_{int(time.time() * 1000)}_{len(self.db)}"
        
        # Generate embedding
        embedding = await self.embedding_generator.generate_embedding(content)
        
        # Create knowledge item
        item = KnowledgeItem(
            content=content,
            metadata=metadata,
            embedding=embedding,
            item_id=item_id,
            timestamp=time.time()
        )
        
        # Add to SQLite store
        self.db[item_id] = {
            "content": content,
            "metadata": metadata,
            "timestamp": item.timestamp
        }
        
        # Add to vector index
        self._add_to_index(item_id, embedding)
        
        logger.debug(f"Added knowledge item {item_id}")
        return item_id
        
    async def add_items(self, items: List[Tuple[str, Dict[str, Any]]]) -> List[str]:
        """
        Add multiple items to the knowledge store.
        
        Args:
            items: List of (content, metadata) tuples
            
        Returns:
            List of added item IDs
        """
        # Generate content list for batch embedding
        contents = [content for content, _ in items]
        
        # Generate embeddings
        embeddings = await self.embedding_generator.generate_embeddings(contents)
        
        # Add each item
        item_ids = []
        for i, ((content, metadata), embedding) in enumerate(zip(items, embeddings)):
            # Generate a unique ID
            item_id = f"item_{int(time.time() * 1000)}_{len(self.db) + i}"
            
            # Create knowledge item
            item = KnowledgeItem(
                content=content,
                metadata=metadata,
                embedding=embedding,
                item_id=item_id,
                timestamp=time.time()
            )
            
            # Add to SQLite store
            self.db[item_id] = {
                "content": content,
                "metadata": metadata,
                "timestamp": item.timestamp
            }
            
            # Add to vector index
            self._add_to_index(item_id, embedding)
            item_ids.append(item_id)
            
        logger.debug(f"Added {len(item_ids)} items to knowledge store")
        return item_ids
        
    def _add_to_index(self, item_id: str, embedding: List[float]) -> None:
        """Add an embedding to the vector index."""
        try:
            # Convert embedding to numpy array
            embedding_array = np.array([embedding], dtype=np.float32)
            
            # Add to index
            self.index.add(embedding_array)
            
            # Map the index to the item ID (in separate "index_map" table)
            with SqliteDict(self.db_path, tablename="index_map", autocommit=True) as index_map:
                # Get current index size
                index_id = self.index.ntotal - 1
                index_map[str(index_id)] = item_id
                
            # Save the index periodically (every 10 additions)
            if self.index.ntotal % 10 == 0:
                self._save_index()
                
        except Exception as e:
            logger.error(f"Error adding to index: {e}")
            
    def _save_index(self) -> None:
        """Save the vector index to disk."""
        try:
            faiss.write_index(self.index, self.index_path)
            logger.debug(f"Saved knowledge index with {self.index.ntotal} vectors")
        except Exception as e:
            logger.error(f"Error saving index: {e}")
            
    async def search(self, query: str, top_k: int = 5) -> List[KnowledgeItem]:
        """
        Search the knowledge store for items similar to the query.
        
        Args:
            query: The search query
            top_k: Number of results to return
            
        Returns:
            List of KnowledgeItem objects
        """
        if self.index.ntotal == 0:
            logger.warning("Knowledge store is empty")
            return []
            
        try:
            # Generate query embedding
            query_embedding = await self.embedding_generator.generate_embedding(query)
            
            # Convert to numpy array
            query_array = np.array([query_embedding], dtype=np.float32)
            
            # Search the index
            top_k = min(top_k, self.index.ntotal)
            distances, indices = self.index.search(query_array, top_k)
            
            # Get the item IDs from the indices
            results = []
            with SqliteDict(self.db_path, tablename="index_map", autocommit=False) as index_map:
                for i, idx in enumerate(indices[0]):
                    index_key = str(idx)
                    if index_key in index_map:
                        item_id = index_map[index_key]
                        if item_id in self.db:
                            item_data = self.db[item_id]
                            item = KnowledgeItem(
                                content=item_data["content"],
                                metadata=item_data["metadata"],
                                embedding=None,  # Don't include embedding in results
                                item_id=item_id,
                                timestamp=item_data["timestamp"]
                            )
                            results.append(item)
                            
            return results
            
        except Exception as e:
            logger.error(f"Error searching knowledge store: {e}")
            return []
            
    def get_item(self, item_id: str) -> Optional[KnowledgeItem]:
        """
        Get an item by ID.
        
        Args:
            item_id: The item ID
            
        Returns:
            KnowledgeItem or None if not found
        """
        if item_id not in self.db:
            return None
            
        item_data = self.db[item_id]
        return KnowledgeItem(
            content=item_data["content"],
            metadata=item_data["metadata"],
            embedding=None,  # Don't include embedding
            item_id=item_id,
            timestamp=item_data["timestamp"]
        )
        
    def delete_item(self, item_id: str) -> bool:
        """
        Delete an item from the store.
        
        Args:
            item_id: The item ID
            
        Returns:
            True if deleted, False if not found
        """
        if item_id not in self.db:
            return False
            
        # Delete from SQLite store
        del self.db[item_id]
        
        # Note: We can't easily delete from the FAISS index,
        # so we'd need to rebuild it for a complete delete.
        # For now, just leave the embedding in the index.
        logger.debug(f"Deleted item {item_id} (embedding remains in index)")
        
        return True
        
    def close(self) -> None:
        """Close the knowledge store and save the index."""
        self._save_index()
        self.db.close()
        logger.info("Knowledge store closed")
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close() 