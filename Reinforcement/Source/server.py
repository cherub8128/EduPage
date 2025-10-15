# filename: server.py
# Description: A simple Flask server to load a local Hugging Face model 
#              and provide a chat API endpoint.

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import torch

# --- Configuration ---
# 1. Flask App Setup
app = Flask(__name__)
# Allow Cross-Origin Resource Sharing for requests from the web browser
CORS(app) 

# 2. Model Loading
# --- IMPORTANT ---
# Change this path to the directory of your local model.
# This can be a model you downloaded or your own fine-tuned model.
MODEL_PATH = "./google/gemma-3-1b-it" 

print(f"Loading AI model from: {MODEL_PATH}...")
# Initialize the text generation pipeline
try:
    pipe = pipeline(
        "text-generation",
        model=MODEL_PATH,
        dtype=torch.float32,
        device_map="auto" # Automatically use GPU if available
    )
    print("AI model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    pipe = None

# 3. API Endpoint for Chat
@app.route('/chat', methods=['POST'])
def chat():
    """Handles chat requests from the frontend."""
    if not pipe:
        return jsonify({"error": "Model is not available."}), 500

    # Get message history from the request
    data = request.json
    messages = data.get('messages', [])
    
    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    # Format the prompt using the model's chat template
    prompt = pipe.tokenizer.apply_chat_template(
        messages, 
        tokenize=False, 
        add_generation_prompt=True
    )

    # Generate a response using the pipeline
    outputs = pipe(
        prompt,
        max_new_tokens=256,
        do_sample=True,
        temperature=0.7,
        top_k=50,
        top_p=0.95
    )
    
    # Extract only the newly generated text
    response_text = outputs[0]["generated_text"][len(prompt):]
    
    return jsonify({"response": response_text.strip()})

# 4. Run the server
if __name__ == '__main__':
    # Runs the Flask app on localhost, accessible on port 5000
    app.run(host='0.0.0.0', port=5000)
