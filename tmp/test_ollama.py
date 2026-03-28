import httpx
import asyncio
import json

async def test_ollama():
    base_url = "http://localhost:11434"
    model = "mistral"
    system_prompt = "Eres un Diseñador de Dashboards."
    user_prompt = "Crea un dashboard para gastos."
    
    url = f"{base_url}/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False
    }
    
    print(f"Enviando POST a {url}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=60.0)
            print(f"STATUS: {response.status_code}")
            print(f"BODY: {response.text}")
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(test_ollama())
