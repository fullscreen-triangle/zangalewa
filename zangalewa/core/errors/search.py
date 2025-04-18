"""
Error searcher for finding error solutions from online sources.
"""

import logging
import aiohttp
import json
import re
import time
from typing import Dict, List, Any, Optional
from bs4 import BeautifulSoup
from dataclasses import dataclass

from zangalewa.utils.config import get_config

logger = logging.getLogger(__name__)

@dataclass
class SearchResultMetrics:
    """Metrics for evaluating the quality of a search result."""
    relevance_score: float = 0.0  # How relevant the result is to the query
    authority_score: float = 0.0  # How authoritative the source is
    recency_score: float = 0.0    # How recent the information is
    community_score: float = 0.0  # How well-received by the community
    completeness_score: float = 0.0  # How complete the solution appears to be
    composite_score: float = 0.0  # Overall quality score

class ErrorSearcher:
    """
    Searches for error solutions from online sources.
    """
    
    def __init__(self):
        """Initialize the error searcher."""
        self.config = get_config()
        
        # Authoritative domain scores for common tech sites (0-10 scale)
        self.authority_domains = {
            "stackoverflow.com": 9.0,
            "github.com": 8.5,
            "developer.mozilla.org": 9.5,
            "reactjs.org": 9.8,
            "nodejs.org": 9.8,
            "npmjs.com": 9.0,
            "react-redux.js.org": 9.0,
            "nextjs.org": 9.5,
            "medium.com": 7.0,
            "dev.to": 7.5,
            "freecodecamp.org": 8.5,
            "stackoverflow.blog": 8.5,
            "css-tricks.com": 8.5,
            "docs.python.org": 9.8,
            "docs.microsoft.com": 9.5,
            "support.google.com": 9.0,
            "web.dev": 9.0,
            "kubernetes.io": 9.5,
            "digitalocean.com/community": 8.0,
            "aws.amazon.com/documentation": 9.5,
            "cloud.google.com": 9.5,
            "blog.logrocket.com": 8.0
        }
        
    async def search_error(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search for an error online.
        
        Args:
            query: The search query
            num_results: Number of results to return
            
        Returns:
            List of search results (title, url, snippet)
        """
        logger.debug(f"Searching for error: {query}")
        
        results = []
        
        # Attempt to search using different methods
        try:
            # First try to search Stack Overflow
            so_results = await self._search_stack_overflow(query, num_results)
            results.extend(so_results)
            
            # If not enough results, try general web search
            if len(results) < num_results:
                web_results = await self._search_web(query, num_results - len(results))
                results.extend(web_results)
                
            # Score and rank results
            scored_results = await self._score_and_rank_results(results, query)
            
            # Return top results
            return scored_results[:num_results]
                
        except Exception as e:
            logger.error(f"Error searching for solutions: {e}")
            # Return an empty result with the error
            results.append({
                "title": "Error searching for solutions",
                "url": "",
                "snippet": f"Failed to search: {str(e)}",
                "source": "error",
                "metrics": SearchResultMetrics()
            })
            
        return results
        
    async def _search_stack_overflow(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """Search Stack Overflow for relevant questions."""
        # Build the Stack Overflow API URL
        api_url = f"https://api.stackexchange.com/2.3/search"
        params = {
            "order": "desc",
            "sort": "relevance",
            "intitle": query,
            "site": "stackoverflow",
            "pagesize": num_results,
            "filter": "withbody"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        results = []
                        for item in data.get("items", []):
                            # Strip HTML tags from the body to get a snippet
                            soup = BeautifulSoup(item.get("body", ""), "html.parser")
                            snippet = soup.get_text()[:250] + "..." if len(soup.get_text()) > 250 else soup.get_text()
                            
                            # Calculate metrics 
                            metrics = SearchResultMetrics()
                            
                            # Community score based on votes and answers
                            metrics.community_score = min(10.0, (item.get("score", 0) / 10.0) + 
                                                         (2.0 if item.get("is_answered", False) else 0.0) +
                                                         min(3.0, item.get("answer_count", 0) * 0.5))
                            
                            # Recency score based on creation date
                            if "creation_date" in item:
                                age_in_days = (time.time() - item["creation_date"]) / (60*60*24)
                                # Higher score for newer content, decreasing over time
                                if age_in_days < 30:  # Last month
                                    metrics.recency_score = 10.0
                                elif age_in_days < 180:  # Last 6 months
                                    metrics.recency_score = 8.0
                                elif age_in_days < 365:  # Last year
                                    metrics.recency_score = 6.0
                                elif age_in_days < 365*2:  # Last 2 years
                                    metrics.recency_score = 4.0
                                else:
                                    metrics.recency_score = 2.0
                            
                            # Relevance score is base score plus accepted answer bonus
                            metrics.relevance_score = 7.0 + (3.0 if item.get("accepted_answer_id") else 0.0)
                            
                            # Authority score for Stack Overflow
                            metrics.authority_score = 9.0  # Stack Overflow is considered authoritative
                            
                            # Completeness score based on question details and existence of accepted answer
                            body_length = len(item.get("body", ""))
                            metrics.completeness_score = min(10.0, (body_length / 1000) * 3.0 + 
                                                          (5.0 if item.get("accepted_answer_id") else 0.0))
                            
                            # Calculate composite score
                            metrics.composite_score = (
                                metrics.relevance_score * 0.3 +
                                metrics.authority_score * 0.2 +
                                metrics.recency_score * 0.15 +
                                metrics.community_score * 0.25 +
                                metrics.completeness_score * 0.1
                            )
                            
                            results.append({
                                "title": item.get("title", ""),
                                "url": item.get("link", ""),
                                "snippet": snippet,
                                "source": "stackoverflow",
                                "score": item.get("score", 0),
                                "answer_count": item.get("answer_count", 0),
                                "is_answered": item.get("is_answered", False),
                                "accepted_answer_id": item.get("accepted_answer_id"),
                                "creation_date": item.get("creation_date"),
                                "metrics": metrics
                            })
                            
                        return results
                    else:
                        logger.warning(f"Stack Overflow API returned status {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error searching Stack Overflow: {e}")
            return []
            
    async def _search_web(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """Perform a general web search for the error."""
        # Use a simple web search
        search_url = "https://www.googleapis.com/customsearch/v1"
        api_key = self.config.get("GOOGLE_API_KEY", "")
        cx = self.config.get("GOOGLE_SEARCH_ENGINE_ID", "")
        
        if not api_key or not cx:
            logger.warning("Google API key or search engine ID not found")
            return [{
                "title": "Web search not available",
                "url": "",
                "snippet": "Configure GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID to enable web search",
                "source": "info",
                "metrics": SearchResultMetrics()
            }]
            
        params = {
            "key": api_key,
            "cx": cx,
            "q": query,
            "num": num_results
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        results = []
                        for item in data.get("items", []):
                            # Extract domain for authority scoring
                            domain = self._extract_domain(item.get("link", ""))
                            
                            # Calculate metrics
                            metrics = SearchResultMetrics()
                            
                            # Authority score based on domain reputation
                            metrics.authority_score = self.authority_domains.get(domain, 5.0)
                            
                            # Recency score - if available in response
                            if "pagemap" in item and "metatags" in item["pagemap"]:
                                for metatag in item["pagemap"]["metatags"]:
                                    if "og:updated_time" in metatag or "article:modified_time" in metatag:
                                        date_str = metatag.get("og:updated_time") or metatag.get("article:modified_time")
                                        try:
                                            # Parse date and calculate recency
                                            date_timestamp = time.mktime(time.strptime(date_str[:10], "%Y-%m-%d"))
                                            age_in_days = (time.time() - date_timestamp) / (60*60*24)
                                            if age_in_days < 30:
                                                metrics.recency_score = 10.0
                                            elif age_in_days < 180:
                                                metrics.recency_score = 8.0
                                            elif age_in_days < 365:
                                                metrics.recency_score = 6.0
                                            else:
                                                metrics.recency_score = 4.0
                                        except:
                                            metrics.recency_score = 5.0  # Default if we can't parse
                            
                            # Default recency score if not found in metadata
                            if metrics.recency_score == 0.0:
                                metrics.recency_score = 5.0
                                
                            # Relevance score based on search ranking and title match
                            title_relevance = 0.0
                            if query.lower() in item.get("title", "").lower():
                                title_relevance = 3.0
                                
                            # Position bonus - earlier results get higher scores
                            position = data.get("items", []).index(item) if "items" in data else 0
                            position_bonus = max(0, 5 - position * 0.5)  # 0-5 bonus based on position
                            
                            metrics.relevance_score = min(10.0, 5.0 + title_relevance + position_bonus)
                            
                            # Community score is unknown for general web search
                            metrics.community_score = 5.0
                            
                            # Completeness score based on snippet length
                            snippet_length = len(item.get("snippet", ""))
                            metrics.completeness_score = min(10.0, snippet_length / 50)
                            
                            # Calculate composite score
                            metrics.composite_score = (
                                metrics.relevance_score * 0.3 +
                                metrics.authority_score * 0.3 +
                                metrics.recency_score * 0.2 +
                                metrics.community_score * 0.1 +
                                metrics.completeness_score * 0.1
                            )
                            
                            results.append({
                                "title": item.get("title", ""),
                                "url": item.get("link", ""),
                                "snippet": item.get("snippet", ""),
                                "source": "web",
                                "domain": domain,
                                "metrics": metrics
                            })
                            
                        return results
                    else:
                        logger.warning(f"Google API returned status {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error searching web: {e}")
            return []
    
    def _extract_domain(self, url: str) -> str:
        """Extract the domain from a URL."""
        try:
            # Simple domain extraction
            domain = url.split("//")[-1].split("/")[0]
            
            # Extract main domain without subdomains
            parts = domain.split(".")
            if len(parts) > 2:
                # Handle domains like co.uk
                if parts[-2] in ["co", "com", "org", "net", "gov", "edu"]:
                    return f"{parts[-3]}.{parts[-2]}.{parts[-1]}"
                return f"{parts[-2]}.{parts[-1]}"
            return domain
        except:
            return ""
    
    async def _score_and_rank_results(self, results: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """
        Score and rank search results based on various quality metrics.
        
        Args:
            results: List of search results
            query: The original search query
            
        Returns:
            Ranked list of search results
        """
        # Ensure all results have metrics
        for result in results:
            if "metrics" not in result:
                # Default metrics if not already calculated
                result["metrics"] = SearchResultMetrics(
                    relevance_score=5.0,
                    authority_score=5.0,
                    recency_score=5.0,
                    community_score=5.0,
                    completeness_score=5.0,
                    composite_score=5.0
                )
                
        # Apply content-aware adjustments to scores
        for result in results:
            # Check for code blocks in the snippet as indicator of programming solution
            if "<code>" in result.get("snippet", "") or "```" in result.get("snippet", ""):
                result["metrics"].completeness_score += 2.0
                
            # Check for "solution" or "fixed" keywords
            if "solution" in result.get("snippet", "").lower() or "fixed" in result.get("snippet", "").lower():
                result["metrics"].relevance_score += 1.0
                
            # Decrease score for results that are just questions without answers
            if "?" in result.get("title", "") and not result.get("is_answered", False):
                result["metrics"].composite_score -= 2.0
                
            # Recalculate composite score with adjusted metrics
            result["metrics"].composite_score = (
                result["metrics"].relevance_score * 0.3 +
                result["metrics"].authority_score * 0.25 +
                result["metrics"].recency_score * 0.15 +
                result["metrics"].community_score * 0.2 +
                result["metrics"].completeness_score * 0.1
            )
            
        # Sort by composite score
        ranked_results = sorted(results, key=lambda x: x["metrics"].composite_score, reverse=True)
        
        return ranked_results
            
    async def search_knowledge_base(self, query: str, knowledge_store: Any) -> List[Dict[str, Any]]:
        """
        Search the local knowledge base for error solutions.
        
        Args:
            query: The search query
            knowledge_store: The knowledge store to search
            
        Returns:
            List of knowledge items relevant to the query
        """
        try:
            if knowledge_store:
                # Use the knowledge store's search function
                items = await knowledge_store.search(query, top_k=5)
                
                results = []
                for item in items:
                    # Create metrics for knowledge base items
                    metrics = SearchResultMetrics(
                        relevance_score=9.0,  # High relevance due to local context
                        authority_score=9.0,  # High authority as it's local knowledge
                        recency_score=8.0,    # Likely recent and relevant
                        community_score=7.0,  # Not community-voted but trusted
                        completeness_score=8.0,  # Likely complete solution
                        composite_score=8.4   # Weighted average of above
                    )
                    
                    results.append({
                        "title": item.metadata.get("title", "Knowledge Base Entry"),
                        "url": item.metadata.get("url", ""),
                        "snippet": item.content[:250] + "..." if len(item.content) > 250 else item.content,
                        "source": "knowledge_base",
                        "item_id": item.item_id,
                        "metrics": metrics
                    })
                    
                return results
            else:
                logger.warning("Knowledge store not available")
                return []
                
        except Exception as e:
            logger.error(f"Error searching knowledge base: {e}")
            return []
            
    async def extract_solution_from_page(self, url: str) -> Optional[str]:
        """
        Extract potential solution from a webpage.
        
        Args:
            url: URL of the page to analyze
            
        Returns:
            Extracted solution text or None if not found
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        html = await response.text()
                        
                        # Parse the HTML
                        soup = BeautifulSoup(html, "html.parser")
                        
                        # For Stack Overflow pages, extract the accepted answer
                        if "stackoverflow.com" in url:
                            accepted_answer = soup.select_one("div.accepted-answer")
                            if accepted_answer:
                                answer_body = accepted_answer.select_one("div.post-text")
                                if answer_body:
                                    return answer_body.get_text()
                                    
                        # For GitHub issue pages, extract the resolution comment
                        if "github.com" in url and "/issues/" in url:
                            # Look for issue closure comment or last comment
                            issue_closed = soup.select("div.TimelineItem")
                            for item in reversed(issue_closed):  # Check from latest
                                if "closed this" in item.get_text():
                                    return item.get_text()
                                    
                            # If no closure found, get the last comment
                            comments = soup.select("div.comment-body")
                            if comments:
                                return comments[-1].get_text()
                                
                        # Generic solution extraction - look for code blocks and surrounding text
                        code_blocks = soup.select("pre code, code, pre")
                        if code_blocks:
                            # Get code block and surrounding paragraph
                            solution_block = ""
                            for block in code_blocks:
                                # Get parent paragraph or div
                                parent = block.parent
                                while parent and parent.name not in ["div", "p", "body", "html"]:
                                    parent = parent.parent
                                    
                                # Extract text from parent
                                if parent:
                                    solution_block += parent.get_text() + "\n\n"
                                else:
                                    solution_block += block.get_text() + "\n\n"
                                    
                            return solution_block if solution_block else None
                            
                        # Fallback to finding paragraphs with solution keywords
                        solution_paragraphs = []
                        for p in soup.select("p"):
                            text = p.get_text().lower()
                            if any(kw in text for kw in ["solution", "solved", "fixed", "workaround", "resolve"]):
                                solution_paragraphs.append(p.get_text())
                                
                        if solution_paragraphs:
                            return "\n\n".join(solution_paragraphs)
                            
        except Exception as e:
            logger.error(f"Error extracting solution from {url}: {e}")
            
        return None 