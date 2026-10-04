from flask import Flask, jsonify, render_template, request, Response
import os
from google import genai
from gradio_client import Client
from dotenv import load_dotenv
from datetime import datetime
from zoneinfo import ZoneInfo


# ==================================================
# Load Environment Variables
# ==================================================

load_dotenv()

app = Flask(__name__)

# ==================================================
# GEMINI CLIENT
# ==================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY is missing from the .env file."
    )

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ==================================================
# SYSTEM PROMPT
# ==================================================

SYSTEM_PROMPT = """
You are a helpful, friendly and beginner-friendly AI assistant.

Follow these rules:

1. Answer the user's question directly and accurately.

2. Keep responses concise.
   Do not give long explanations unless the user specifically
   asks for a detailed explanation.

3. Match the length of your answer to the user's question.

4. For simple questions, give a short and simple answer.
   Usually 1 to 4 sentences are enough.

5. If the user asks "What is...", give:
   - a simple definition
   - a short explanation or example if useful

6. If the user asks "Explain...", give a slightly more detailed
   explanation, but still avoid unnecessary information.

7. If the user asks for a detailed explanation, provide a
   longer and more detailed answer.

8. Do not repeat the same information in different ways.

9. Do not add unnecessary background information.

10. Do not add information that the user did not ask for unless
    it is necessary to understand the answer.

11. Use simple language that beginners can understand.

12. Use short headings and bullet points when they genuinely
    improve readability.

13. Do not use unnecessary Markdown symbols.

14. If the user asks a simple factual question, answer it directly.

15. If the user asks a yes/no question, answer yes or no first,
    then briefly explain why.

16. If the user asks for an example, give a few relevant examples.

17. If the user wants more information, they can ask for it.
    Do not provide everything at once.

18. Answer entirely in English.

19. Do not invent information.

20. When the user asks for the current time or date,
    use the exact information provided by the system.

Your main goal is to be helpful without overwhelming the user.
"""


# ==================================================
# WORLD TIME ZONES
# ==================================================

TIMEZONE_MAP = {

    # -----------------------------
    # India
    # -----------------------------
    "india": "Asia/Kolkata",
    "indian time": "Asia/Kolkata",
    "ist": "Asia/Kolkata",
    "delhi": "Asia/Kolkata",
    "mumbai": "Asia/Kolkata",
    "bangalore": "Asia/Kolkata",
    "bengaluru": "Asia/Kolkata",
    "chennai": "Asia/Kolkata",
    "hyderabad": "Asia/Kolkata",
    "kolkata": "Asia/Kolkata",

    # -----------------------------
    # Switzerland
    # -----------------------------
    "switzerland": "Europe/Zurich",
    "zurich": "Europe/Zurich",
    "geneva": "Europe/Zurich",

    # -----------------------------
    # United Kingdom
    # -----------------------------
    "uk": "Europe/London",
    "united kingdom": "Europe/London",
    "britain": "Europe/London",
    "london": "Europe/London",
    "england": "Europe/London",

    # -----------------------------
    # United States
    # -----------------------------
    "usa": "America/New_York",
    "us": "America/New_York",
    "u.s.": "America/New_York",
    "united states": "America/New_York",

    "new york": "America/New_York",
    "new york city": "America/New_York",
    "washington": "America/New_York",
    "washington dc": "America/New_York",
    "florida": "America/New_York",
    "miami": "America/New_York",

    "chicago": "America/Chicago",
    "texas": "America/Chicago",
    "dallas": "America/Chicago",
    "houston": "America/Chicago",

    "denver": "America/Denver",
    "colorado": "America/Denver",

    "los angeles": "America/Los_Angeles",
    "san francisco": "America/Los_Angeles",
    "california": "America/Los_Angeles",
    "las vegas": "America/Los_Angeles",

    # -----------------------------
    # Canada
    # -----------------------------
    "canada": "America/Toronto",
    "toronto": "America/Toronto",
    "vancouver": "America/Vancouver",
    "montreal": "America/Toronto",

    # -----------------------------
    # Europe
    # -----------------------------
    "germany": "Europe/Berlin",
    "berlin": "Europe/Berlin",

    "france": "Europe/Paris",
    "paris": "Europe/Paris",

    "italy": "Europe/Rome",
    "rome": "Europe/Rome",

    "spain": "Europe/Madrid",
    "madrid": "Europe/Madrid",

    "netherlands": "Europe/Amsterdam",
    "amsterdam": "Europe/Amsterdam",

    "portugal": "Europe/Lisbon",
    "lisbon": "Europe/Lisbon",

    "greece": "Europe/Athens",
    "athens": "Europe/Athens",

    "ireland": "Europe/Dublin",
    "dublin": "Europe/Dublin",

    "austria": "Europe/Vienna",
    "vienna": "Europe/Vienna",

    "sweden": "Europe/Stockholm",
    "stockholm": "Europe/Stockholm",

    "norway": "Europe/Oslo",
    "oslo": "Europe/Oslo",

    "denmark": "Europe/Copenhagen",
    "copenhagen": "Europe/Copenhagen",

    "finland": "Europe/Helsinki",
    "helsinki": "Europe/Helsinki",

    "poland": "Europe/Warsaw",
    "warsaw": "Europe/Warsaw",

    # -----------------------------
    # Asia
    # -----------------------------
    "japan": "Asia/Tokyo",
    "tokyo": "Asia/Tokyo",

    "china": "Asia/Shanghai",
    "beijing": "Asia/Shanghai",
    "shanghai": "Asia/Shanghai",

    "singapore": "Asia/Singapore",

    "south korea": "Asia/Seoul",
    "korea": "Asia/Seoul",
    "seoul": "Asia/Seoul",

    "thailand": "Asia/Bangkok",
    "bangkok": "Asia/Bangkok",

    "malaysia": "Asia/Kuala_Lumpur",
    "kuala lumpur": "Asia/Kuala_Lumpur",

    "indonesia": "Asia/Jakarta",
    "jakarta": "Asia/Jakarta",

    "philippines": "Asia/Manila",
    "manila": "Asia/Manila",

    "uae": "Asia/Dubai",
    "dubai": "Asia/Dubai",

    "saudi arabia": "Asia/Riyadh",
    "riyadh": "Asia/Riyadh",

    "qatar": "Asia/Qatar",
    "doha": "Asia/Qatar",

    "turkey": "Europe/Istanbul",
    "istanbul": "Europe/Istanbul",

    # -----------------------------
    # Australia
    # -----------------------------
    "australia": "Australia/Sydney",
    "sydney": "Australia/Sydney",
    "melbourne": "Australia/Melbourne",
    "perth": "Australia/Perth",
    "brisbane": "Australia/Brisbane",

    # -----------------------------
    # Other
    # -----------------------------
    "brazil": "America/Sao_Paulo",
    "mexico": "America/Mexico_City",
    "south africa": "Africa/Johannesburg",
    "egypt": "Africa/Cairo",
    "new zealand": "Pacific/Auckland",
    "auckland": "Pacific/Auckland"
}


# ==================================================
# FIND TIMEZONE
# ==================================================

def get_requested_timezone(message):

    message_lower = message.lower()

    # Check longer names first
    locations = sorted(
        TIMEZONE_MAP.keys(),
        key=len,
        reverse=True
    )

    for location in locations:

        if location in message_lower:

            return TIMEZONE_MAP[location], location

    return None, None


# ==================================================
# CHECK WHETHER USER IS ASKING FOR TIME
# ==================================================

def is_time_request(message):

    message_lower = message.lower()

    time_words = [
        "current time",
        "time now",
        "time right now",
        "what time is it",
        "what is the time",
        "time in",
        "time at",
        "local time"
    ]

    return any(
        word in message_lower
        for word in time_words
    )


# ==================================================
# HOME PAGE
# ==================================================

@app.route('/')
def index():

    return render_template('index.html')


# ==================================================
# CHAT ROUTE
# ==================================================

@app.route('/chat', methods=['POST'])
def chat():

    data = request.get_json()

    # --------------------------------------------------
    # Check message
    # --------------------------------------------------

    if not data or 'message' not in data:

        return jsonify({
            'error': 'No message was sent.'
        }), 400


    user_message = data['message'].strip()


    # --------------------------------------------------
    # Check empty message
    # --------------------------------------------------

    if not user_message:

        return jsonify({
            'error': 'Message cannot be empty.'
        }), 400


    # ==================================================
    # DIRECT WORLD TIME RESPONSE
    # ==================================================

    if is_time_request(user_message):

        requested_timezone, requested_location = \
            get_requested_timezone(user_message)


        # If a location was found
        if requested_timezone:

            location_time = datetime.now(
                ZoneInfo(requested_timezone)
            )


            formatted_time = location_time.strftime(
                "%I:%M %p"
            )


            formatted_date = location_time.strftime(
                "%B %d, %Y"
            )


            response_text = (
                f"The current time in "
                f"{requested_location.title()} is "
                f"{formatted_time} "
                f"on {formatted_date}."
            )


            # Return directly without AI
            return Response(
                response_text,
                mimetype='text/plain'
            )


    # ==================================================
    # NORMAL AI CHAT
    # ==================================================

    conversation_history = data.get(
        'history',
        []
    )


    # --------------------------------------------------
    # Current India Date and Time
    # --------------------------------------------------

    india_time = datetime.now(
        ZoneInfo("Asia/Kolkata")
    )


    current_date = india_time.strftime(
        "%B %d, %Y"
    )


    current_time = india_time.strftime(
        "%I:%M %p"
    )


    print(
        "USER MESSAGE:",
        user_message
    )


    print(
        "CURRENT DATE:",
        current_date
    )


    print(
        "CURRENT TIME:",
        current_time
    )


    # ==================================================
    # GEMINI AI CHAT
    # ==================================================

    try:

        # --------------------------------------------------
        # Build conversation
        # --------------------------------------------------

        date_time_instruction = f"""
CURRENT DATE AND TIME:

Today's date in India is:
{current_date}

Current time in India is:
{current_time}

Use this information when the user asks about
today's date or today's date in India.

Do not invent dates or times.
"""

        conversation = SYSTEM_PROMPT + "\n" + date_time_instruction

        for message in conversation_history[-6:]:

            role = message.get("role")
            content = message.get("content")

            if role == "user":

                conversation += (
                    f"\n\nUser: {content}"
                )

            elif role == "assistant":

                conversation += (
                    f"\n\nAssistant: {content}"
                )

        conversation += (
            f"\n\nUser: {user_message}"
            "\n\nAssistant:"
        )

        # --------------------------------------------------
        # Generate Gemini Response - Streaming
        # --------------------------------------------------

        response = gemini_client.models.generate_content_stream(
            model="gemini-3.6-flash",
            contents=conversation
        )

        # --------------------------------------------------
        # Stream Gemini Response
        # --------------------------------------------------

        def generate():

            try:

                for chunk in response:

                    if chunk.text:

                        print(
                            "Gemini chunk:",
                            repr(chunk.text)
                        )

                        yield chunk.text.encode("utf-8")


            except Exception as stream_error:

                print(
                    "Gemini streaming error:",
                    repr(stream_error)
                )

                yield (
                    "\n\nGemini streaming error: "
                    + str(stream_error)
                ).encode("utf-8")
                
        # --------------------------------------------------
        # Return Streaming Response
        # --------------------------------------------------

        return Response(
            generate(),
            status=200,
            mimetype="text/plain",
            direct_passthrough=True,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive"
            }
        )


    except Exception as e:

        app.logger.exception(
            "Error while calling Gemini API"
        )

        return jsonify({
            "error": str(e)
        }), 500


# ==================================================
# IMAGE GENERATION
# ==================================================
@app.route('/generate-image', methods=['POST'])
def generate_image():

    data = request.get_json()

    # Check prompt
    if not data or 'prompt' not in data:
        return jsonify({
            'error': 'No image prompt was provided.'
        }), 400

    image_prompt = data['prompt'].strip()

    if not image_prompt:
        return jsonify({
            'error': 'Image prompt cannot be empty.'
        }), 400

    try:
        # Connect to the free Hugging Face Space
        image_client = Client(
            "black-forest-labs/FLUX.2-klein-4B"
        )

        # Generate image
        result = image_client.predict(
            prompt=image_prompt,
            input_images=[],
            mode_choice="Distilled (4 steps)",
            seed=0,
            randomize_seed=True,
            width=1024,
            height=1024,
            num_inference_steps=4,
            guidance_scale=1.0,
            prompt_upsampling=False,
            api_name="/infer"
        )

       # The first returned value is the generated image
        image_path = result[0]

        # Copy it into our Flask static folder
        static_path = os.path.join(
            app.static_folder,
            "generated_image.png"
        )

        from PIL import Image

        image = Image.open(image_path)
        image.save(static_path)

        return jsonify({
            "image_url": "/static/generated_image.png"
        })

    except Exception as e:

        print("IMAGE GENERATION ERROR:", repr(e))

        app.logger.exception(
            "Error while generating image"
        )

        return jsonify({
            "error": str(e)
        }), 500

# ==================================================
# RUN FLASK
# ==================================================

if __name__ == '__main__':

    app.run(

        host="0.0.0.0",

        port=5000,

        debug=True
    )