from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
from datetime import datetime
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Download required NLTK data
nltk.download('punkt')
nltk.download('stopwords')

# Initialize Whisper model
model = None

def load_whisper_model():
    global model
    if model is None:
        model = whisper.load_model("base")
    return model

def analyze_speech(text):
    tokens = word_tokenize(text.lower())
    filler_words = {"um", "uh", "like", "you know", "actually", "basically", "literally"}
    filler_count = sum(1 for token in tokens if token in filler_words)
    total_words = len(tokens)
    filler_ratio = filler_count / total_words if total_words > 0 else 0
    
    return {
        "total_words": total_words,
        "filler_words": filler_count,
        "filler_ratio": filler_ratio
    }

def score_answer(text, job_description):
    if not job_description:
        return None
        
    job_tokens = set(word_tokenize(job_description.lower()))
    stop_words = set(stopwords.words('english'))
    keywords = {word for word in job_tokens if word not in stop_words and word.isalnum()}
    
    answer_tokens = set(word_tokenize(text.lower()))
    matches = keywords.intersection(answer_tokens)
    
    score = len(matches) / len(keywords) if keywords else 0
    return {
        "score": score * 100,
        "matched_keywords": list(matches)
    }

@app.route('/api/process_audio', methods=['POST'])
def process_audio():
    try:
        # Get audio data from request
        audio_data = request.files['audio']
        job_description = request.form.get('job_description', '')
        
        # Save audio to temporary file
        temp_dir = tempfile.gettempdir()
        temp_file = os.path.join(temp_dir, f"interview_{datetime.now().strftime('%Y%m%d_%H%M%S')}.wav")
        audio_data.save(temp_file)
        
        # Load model and transcribe
        model = load_whisper_model()
        result = model.transcribe(temp_file)
        transcribed_text = result["text"]
        
        # Analyze speech
        analysis = analyze_speech(transcribed_text)
        
        # Score answer if job description provided
        score_results = None
        if job_description:
            score_results = score_answer(transcribed_text, job_description)
        
        # Generate feedback
        feedback = []
        if analysis['filler_ratio'] > 0.1:
            feedback.append("Try to reduce filler words like 'um', 'uh', and 'like'.")
        
        if analysis['total_words'] < 50:
            feedback.append("Consider providing more detailed answers.")
        elif analysis['total_words'] > 300:
            feedback.append("Your answer might be too long. Try to be more concise.")
        
        if score_results and score_results['score'] < 50:
            feedback.append("Try to incorporate more keywords from the job description.")
        
        if not feedback:
            feedback.append("Great job! Your answer was clear and well-structured.")
        
        # Clean up
        os.remove(temp_file)
        
        return jsonify({
            'success': True,
            'transcription': transcribed_text,
            'analysis': analysis,
            'score': score_results,
            'feedback': feedback
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000) 