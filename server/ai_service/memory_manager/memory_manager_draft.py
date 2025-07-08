import faiss
import numpy as np
import subprocess
import json
from collections import deque
from typing import List, Dict, Any, Optional

class OllamaClient:
    """
    Simple wrapper to call ollama CLI for embeddings and completions using deepseek-r1:8b.
    """
    model = 'deepseek-r1:8b'

    @staticmethod
    def embed(texts: List[str]) -> np.ndarray:
        """Generate embeddings for a list of texts."""
        # Prepare input JSON
        data = {'texts': texts}
        result = subprocess.run(
            ['ollama', 'embed', OllamaClient.model],
            input=json.dumps(data).encode(),
            stdout=subprocess.PIPE,
            check=True
        )
        # Expect JSON array of embedding lists
        embeds = json.loads(result.stdout.decode())
        return np.array(embeds, dtype=np.float32)

    @staticmethod
    def summarize(text: str) -> str:
        """Generate a concise summary of the given text."""
        # Use completion with a summarization prompt
        prompt = f"Summarize the following text concisely:\n{text}\nSummary:"  
        result = subprocess.run(
            ['ollama', 'run', OllamaClient.model, '--prompt', prompt, '--stream=false'],
            stdout=subprocess.PIPE,
            check=True
        )
        return result.stdout.decode().strip()

class MemoryManager:
    """
    Handles hybrid memory: sliding-window recency, scene summaries, and RAG retrieval with FAISS.

    Uses Ollama deepseek-r1:8b for both embeddings and summarization.
    """
    def __init__(
        self,
        recency_window: int = 20,
        embedding_dim: Optional[int] = None
    ):
        # Determine embedding dimension by probing a dummy embed
        test = OllamaClient.embed(['test'])
        dim = test.shape[1]
        embedding_dim = embedding_dim or dim
        # Initialize FAISS index (L2)
        self.index = faiss.IndexFlatL2(embedding_dim)
        self.metadata: List[Dict[str, Any]] = []
        # Recency buffer
        self.recency_queue = deque(maxlen=recency_window)
        # Scene summaries stored for context
        self.summaries: List[Dict[str, Any]] = []

    def add_snippet(self, text: str, date: str, location: str, characters: List[str], scene_summary: Optional[str] = None):
        """Index a lore or scene summary snippet with metadata."""
        vec = OllamaClient.embed([text])
        self.index.add(vec)
        entry = {
            'text': text,
            'date': date,
            'location': location,
            'characters': characters,
            'scene_summary': scene_summary or ''
        }
        self.metadata.append(entry)

    def retrieve_snippets(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve top-k relevant snippets for a query."""
        vec = OllamaClient.embed([query])
        distances, indices = self.index.search(vec, k)
        results = []
        for idx in indices[0]:
            if 0 <= idx < len(self.metadata):
                results.append(self.metadata[idx])
        return results

    def add_message(self, message: str):
        """Add message to recency window."""
        self.recency_queue.append(message)

    def summarize_scene(self, date: str, location: str, characters: List[str]):
        """Summarize current scene buffer, index it, and clear the buffer."""
        messages = list(self.recency_queue)
        text = '\n'.join(messages)
        summary_text = OllamaClient.summarize(text)
        self.summaries.append({
            'date': date,
            'location': location,
            'characters': characters,
            'scene_summary': summary_text
        })
        # Index the summary
        self.add_snippet(
            text=summary_text,
            date=date,
            location=location,
            characters=characters,
            scene_summary=summary_text
        )
        self.recency_queue.clear()

    def get_context(self, user_message: str, n_summaries: int = 3, k_snippets: int = 5) -> Dict[str, Any]:
        """Assemble RAG context: recent summaries, top-k snippets, and recency."""
        recent_summaries = self.summaries[-n_summaries:]
        retrieved = self.retrieve_snippets(user_message, k=k_snippets)
        return {
            'scene_summaries': recent_summaries,
            'retrieved_snippets': retrieved,
            'recent_messages': list(self.recency_queue)
        }

# Example usage:
# from memory_manager import MemoryManager
# mgr = MemoryManager()
# mgr.add_message("The party enters a torch-lit cavern.")
# mgr.summarize_scene(date="2025-07-10", location="Cavern", characters=["Alice"])
# context = mgr.get_context("I open the door.")
# print(context)
