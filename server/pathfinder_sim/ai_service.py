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

    def chat(self, text: str, message_type: str = 'in-character') -> dict:
        """
        Generate a chatbot response for the provided text.
        Uses DSPy+Ollama if available, else creates simple RPG-style responses.

        Args:
            text: The user's input message.
            message_type: The type of message ('in-character' or 'out-of-character')

        Returns:
            dict: { 'sender': 'DM', 'text': ... }
        """
        if self.use_ollama:
            try:
                # Craft a prompt that guides the LLM to respond as a Dungeon Master
                prompt = f"""You are the Dungeon Master in a fantasy RPG game. 
                A player has sent the following message: "{text}"
                
                Respond as the DM would, describing the environment, NPCs' reactions, or advancing the story.
                Keep your response concise (1-3 sentences) but engaging."""
                
                # Query the LM via DSPy
                response = dspy.llm(prompt)
                # If response is an object with content, extract it
                content = getattr(response, 'content', str(response))
                return {'sender': 'DM', 'text': content}
            except Exception as e:
                return {'sender': 'DM', 'text': f"[AI error] {e}"}
        
        # Fallback with better RPG-style responses
        if message_type == 'in-character':
            # Generate simple contextual responses for different message patterns
            if '?' in text:
                return {'sender': 'DM', 'text': f"The Dungeon Master considers your question. \"That's an interesting point about '{text}'. Let me think about that...\""}
            elif any(word in text.lower() for word in ['attack', 'fight', 'hit', 'strike']):
                return {'sender': 'DM', 'text': f"You prepare to engage in combat. Roll for initiative!"}
            elif any(word in text.lower() for word in ['look', 'see', 'examine', 'check']):
                return {'sender': 'DM', 'text': f"You carefully examine your surroundings. The area appears to hold secrets waiting to be discovered."}
            elif any(word in text.lower() for word in ['hello', 'hi', 'greetings', 'hey']):
                return {'sender': 'DM', 'text': f"The nearby characters acknowledge your greeting with various gestures of welcome."}
            else:
                return {'sender': 'DM', 'text': f"The Dungeon Master nods thoughtfully at your actions. \"Interesting approach. Let's see how this unfolds...\""}
        else:  # out-of-character
            return {'sender': 'Game Master', 'text': f"[OOC] Acknowledged: {text}"}