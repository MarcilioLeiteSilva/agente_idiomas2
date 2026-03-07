import json
from services.ai.openai_client import OpenAIClient
from services.ai.prompt_registry import PromptRegistry

class MemoryExtractorService:
    def __init__(self):
        self.ai = OpenAIClient()
        self.prompts = PromptRegistry()

    def extract_signals(self, target_language, user_input, feedback_text):
        prompt = self.prompts.get_memory_extraction_v2_prompt(target_language, user_input, feedback_text)
        
        messages = [
            {"role": "system", "content": prompt}
        ]
        
        try:
            response = self.ai.client.chat.completions.create(
                model=self.ai.text_model,
                messages=messages,
                response_format={ "type": "json_object" }
            )
            
            content = response.choices[0].message.content
            # The prompt asks for a JSON list, but response_format json_object needs an object.
            # I'll wrap it in "signals" key in prompt logic or handles here.
            # Let's assume content is {"signals": [...] } or similar.
            data = json.loads(content)
            
            # Normalizing if it's a list directly (if we didn't use json_object) 
            # or extracting from a likely key
            if "signals" in data:
                return data["signals"]
            elif isinstance(data, list):
                return data
            else:
                return [data] # Fallback
                
        except Exception as e:
            print(f"Error extracting memory signals: {e}")
            return []
