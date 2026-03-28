from openai import OpenAI
from app.core.config import settings
from .base import BaseLLMAdapter

class OpenAIAdapter(BaseLLMAdapter):
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_response(self, system_prompt: str, user_prompt: str) -> str:
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0
        )
        return response.choices[0].message.content
