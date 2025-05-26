# ai_service.py
"""
AIService powered by DSPy + Ollama integration.
If OLLAMA_HOST and OLLAMA_MODEL are set, it will route through a local Ollama server via DSPy.
Otherwise, falls back to echo.

Defaults to the most lightweight Ollama model (e.g., llama3.2:1b) for minimal resource usage.
"""
import os
import dspy

class AIService:
    def __init__(self):
        # Configure DSPy to use Ollama or fallback
        host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        # Default to llama3.2:1b for lightweight footprint
        model = os.getenv('OLLAMA_MODEL', 'llama3.2:1b')
        try:
            # Instantiate Ollama-backed DSPy LM
            lm = dspy.LM(
                model=f"ollama_chat/{model}",
                api_base=host,
                api_key=""
            )
            dspy.configure(lm=lm)
            self.use_ollama = True
        except Exception:
            # Ollama or DSPy not available: fallback
            self.use_ollama = False

    def chat(self, text: str) -> dict:
        """
        Generate a chatbot response for the provided text.
        Uses DSPy+Ollama if available, else echoes.

        Args:
            text: The user's input message.

        Returns:
            dict: { 'sender': 'DM', 'text': ... }
        """
        if self.use_ollama:
            try:
                # Query the LM via DSPy
                response = dspy.llm(text)
                # If response is an object with content, extract it
                content = getattr(response, 'content', str(response))
                return {'sender': 'DM', 'text': content}
            except Exception as e:
                return {'sender': 'DM', 'text': f"[AI error] {e}"}
        # Fallback echo
        return {'sender': 'DM', 'text': f"DM (echo): {text}"}