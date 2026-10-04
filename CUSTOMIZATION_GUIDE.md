# Implementation Details & Customization Guide

## System Architecture

### Detection Pipeline
```
User Input
    ↓
[Conversation History + User Message]
    ↓
[Gemini AI Intent Analysis]
    ↓
Binary Decision: Image Needed? YES/NO
    ↓
Route to appropriate handler
```

### Request Flow Diagram

```
POST /chat
│
├─ Time Request Check
│  ├─ YES → Return direct time response
│  └─ NO → Continue
│
├─ AI Intent Detection
│  ├─ needs_image = detect_image_generation_intent()
│  └─ Calls Gemini API (~200-500ms)
│
├─ Image Needed?
│  │
│  ├─ YES → handle_image_and_text_response()
│  │   ├─ Generate text (Gemini)
│  │   ├─ Extract image prompt (Gemini)
│  │   ├─ Generate image (FLUX)
│  │   └─ Return JSON {text, image_url, has_image}
│  │
│  └─ NO → handle_text_only_response()
│      ├─ Generate text (Gemini, streaming)
│      └─ Return plain text
│
└─ Frontend receives response
   ├─ If JSON → Display text + image
   └─ If text → Display streaming text
```

---

## Customization Options

### 1. Adjust Image Detection Sensitivity

**Location**: `app.py` - `detect_image_generation_intent()` function

**Current Prompt**:
```python
detection_prompt = f"""
Analyze whether the user's message is requesting image or visual content generation.

Recent conversation context:
{context}

Current user message: "{message}"

Respond with ONLY one word:
- "YES" if the user is asking for image/visual/picture/diagram/illustration/artwork generation
- "NO" if the user is asking for text-based information only

Consider natural language variations and context.
Do not be overly strict - if there's a reasonable interpretation that the user wants visual content, respond YES.
"""
```

**To Make It More Strict** (fewer false positives):
- Add: "Only respond YES if the user explicitly requests visual content generation."
- Remove: "Do not be overly strict..."

**To Make It More Lenient** (more images generated):
- Add: "Include requests for diagrams, charts, infographics, and visual explanations."
- Change: "if there's a reasonable interpretation" to "if there's any possibility"

---

### 2. Customize Image Prompt Generation

**Location**: `app.py` - `extract_image_prompt()` function

**Current Approach**: Uses Gemini to create detailed, creative prompts

**Alternatives**:

#### Option A: Use user message directly
```python
def extract_image_prompt(user_message, assistant_response):
    return user_message[:200]  # Simple, direct
```

#### Option B: Add style preferences
```python
extraction_prompt = f"""
Create an image generation prompt based on user request.

User request: "{user_message}"

Add these style elements:
- Photorealistic OR Artistic (decide from context)
- High quality, detailed
- Professional lighting

Prompt (max 100 words):
"""
```

#### Option C: Template-based
```python
def extract_image_prompt(user_message, assistant_response):
    # Extract key elements and format consistently
    style = "photorealistic"  # or "artistic"
    return f"{user_message} in {style} style, high quality, detailed"
```

---

### 3. Change Image Model

**Current Model**: FLUX.2-klein-4B (from Hugging Face)

**Located in**: `app.py` - `handle_image_and_text_response()` function

**To Change**:
```python
# Replace this line:
image_client = Client("black-forest-labs/FLUX.2-klein-4B")

# With alternative models:
image_client = Client("black-forest-labs/FLUX.1-schnell")  # Faster, lower quality
image_client = Client("damo-vilab/text-to-video-ms-1.0b")  # For videos
```

**Popular Alternatives**:
- `FLUX.1-schnell`: Faster, good quality
- `stable-diffusion-v1-5`: Classic, well-tested
- `deliberate-v2`: Artistic style
- `dark-sushi-mix`: Specialized models

---

### 4. Adjust Image Generation Parameters

**Location**: `app.py` - `handle_image_and_text_response()` function

```python
result = image_client.predict(
    prompt=image_prompt,
    input_images=[],
    mode_choice="Distilled (4 steps)",      # ← Change inference steps
    seed=0,
    randomize_seed=True,
    width=1024,                             # ← Change resolution
    height=1024,                            # ← Change resolution
    num_inference_steps=4,                  # ← More steps = better quality but slower
    guidance_scale=1.0,                     # ← Higher = more prompt adherence
    prompt_upsampling=False,
    api_name="/infer"
)
```

**Parameter Guide**:
| Parameter | Current | Effect |
|-----------|---------|--------|
| `mode_choice` | Distilled (4 steps) | Can change to other modes if available |
| `width` / `height` | 1024x1024 | Larger = more detailed but slower |
| `num_inference_steps` | 4 | Higher (8-20) = better quality but slower |
| `guidance_scale` | 1.0 | Higher (7.5-15) = stricter prompt adherence |
| `randomize_seed` | True | False = deterministic results |

---

### 5. Filter Image Requests by Category

**Add Category-Based Detection**:

```python
def detect_image_generation_intent_with_categories(message, conversation_history):
    """Detect image intent AND categorize it"""
    
    # First, detect if image is needed
    if not detect_image_generation_intent(message, conversation_history):
        return False, None
    
    # Then categorize for custom handling
    categorize_prompt = f"""
Categorize this image request:
Message: "{message}"

Respond with ONE category:
- PHOTO (realistic photographs)
- ARTWORK (paintings, drawings)
- DIAGRAM (technical diagrams, charts)
- CONCEPT (conceptual visualization)
- OTHER

Category:
"""
    
    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=categorize_prompt
    )
    
    category = response.text.strip()
    return True, category
```

**Use it in /chat**:
```python
needs_image, category = detect_image_generation_intent_with_categories(...)

if needs_image:
    if category == "PHOTO":
        # Use photorealistic model
    elif category == "ARTWORK":
        # Use artistic model
    # etc.
```

---

### 6. Add Request Filtering

**Prevent certain requests from generating images**:

```python
def should_generate_image(message, category):
    """Additional filters"""
    
    # Block inappropriate content
    blocked_words = ["weapon", "violence", "explicit"]
    if any(word in message.lower() for word in blocked_words):
        return False
    
    # Only generate images for specific categories
    allowed_categories = ["PHOTO", "ARTWORK", "CONCEPT"]
    if category not in allowed_categories:
        return False
    
    # Rate limiting per user (if implemented)
    # Check user image generation count
    
    return True

# In /chat:
if needs_image and should_generate_image(user_message, category):
    return handle_image_and_text_response(...)
```

---

### 7. Add Logging for Analytics

**Track image generation patterns**:

```python
import json
from datetime import datetime

def log_image_request(user_message, detected, category, success):
    """Log for analytics"""
    
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "message": user_message[:100],  # First 100 chars
        "detected": detected,
        "category": category,
        "success": success
    }
    
    with open("image_requests.jsonl", "a") as f:
        f.write(json.dumps(log_entry) + "\n")

# Usage in /chat:
detected = detect_image_generation_intent(...)
log_image_request(user_message, detected, category, True)
```

---

## Performance Optimization Tips

### 1. Cache Intent Detection
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def detect_image_generation_intent_cached(message_hash):
    # Cache results for identical messages
    pass
```

### 2. Parallel Generation (Text + Image)
```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=2) as executor:
    text_future = executor.submit(generate_text, ...)
    image_future = executor.submit(generate_image, ...)
    
    text_result = text_future.result()
    image_result = image_future.result()
```

### 3. Pre-calculate Common Requests
```python
# Pre-generate images for common requests
CACHED_RESPONSES = {
    "show me a sunset": "/static/cached/sunset.png",
    "draw a dragon": "/static/cached/dragon.png"
}
```

---

## Troubleshooting

### Issue: Images generated for text-only requests
**Solution**: Lower detection threshold by making the detection prompt more strict

### Issue: Natural image requests not detected
**Solution**: Make the detection prompt more lenient with examples

### Issue: Image generation too slow
**Solution**: Switch to faster model (FLUX.1-schnell) or reduce resolution

### Issue: Low quality images
**Solution**: Increase `num_inference_steps` or improve image prompt in `extract_image_prompt()`

---

## API Costs Consideration

- **Gemini API**: ~0.075¢ per 1M input tokens (detection calls are small)
- **FLUX Model**: Free (Hugging Face Community)
- **Per-request cost**: ~0.05-0.1¢ for detection + image generation

---

## Future Enhancements

1. **Multi-modal Input**: Accept images as input for style reference
2. **Image Variations**: "Generate 3 variations of this image"
3. **Image Editing**: "Make it darker" / "Add more detail"
4. **Video Generation**: Extend to video creation for requests like "Animate this"
5. **User Preferences**: Remember user's image style preferences
6. **A/B Testing**: Test different detection models and track accuracy

