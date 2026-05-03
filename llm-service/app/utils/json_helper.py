import json
import re

def extract_json(text: str) -> dict:
    """
    Extrae un objeto JSON de una cadena de texto, incluso si tiene texto antes o después.
    """
    try:
        # Intenta cargar directamente
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # Busca el primer '{' y el último '}'
        match = re.search(r'(\{.*\})', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Intenta quitar bloques de código markdown
        clean_text = text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            raise ValueError(f"No se pudo extraer un JSON válido de la respuesta: {text[:100]}...")
