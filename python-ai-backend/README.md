# Python AI Backend for Voice Email System

This is the AI-powered backend service that provides speech processing, intent classification, and spam detection capabilities for the Voice Email System.

## Features

- **Speech-to-Text**: Convert voice recordings to text using OpenAI Whisper
- **Text-to-Speech**: Convert text to natural-sounding speech using gTTS
- **Intent Classification**: Parse voice commands and extract user intent using Transformers
- **Spam Detection**: Identify spam emails using ML models and rule-based detection

## Prerequisites

- Python 3.9+
- pip or conda
- ffmpeg (for audio processing)
- 4GB+ RAM (for model loading)

## Quick Start

### 1. Install Dependencies

```bash
cd python-ai-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# PORT=5000
# WHISPER_MODEL=base
# CORS_ORIGIN=http://localhost:3000
```

### 3. Download Models (First Time)

Models will download automatically on first run, but you can pre-download:

```bash
python -c "import whisper; whisper.load_model('base')"
```

### 4. Run the Server

```bash
python app.py
```

Server will start on `http://localhost:5000`

## API Endpoints

### Health Check
```bash
GET /health
```

### Speech-to-Text
```bash
POST /api/speech-to-text
Content-Type: application/json

{
  "audio": "base64_encoded_audio_data",
  "language": "en"
}

Response:
{
  "text": "transcribed text",
  "confidence": 0.95
}
```

### Text-to-Speech
```bash
POST /api/text-to-speech
Content-Type: application/json

{
  "text": "Hello, this is a test",
  "language": "en"
}

Response: audio/mpeg file
```

### Voice Command Processing
```bash
POST /api/voice-command
Content-Type: application/json

{
  "text": "read my inbox"
}

Response:
{
  "intent": "read_inbox",
  "confidence": 0.98,
  "entities": {}
}
```

### Spam Detection
```bash
POST /api/spam-detection
Content-Type: application/json

{
  "subject": "You won a million dollars!",
  "body": "Click here to claim your prize..."
}

Response:
{
  "is_spam": true,
  "confidence": 0.87,
  "reason": "Contains spam keywords: million dollars, click here"
}
```

## Docker Deployment

```bash
# Build image
docker build -t voice-email-ai .

# Run container
docker run -p 5000:5000 \
  -e CORS_ORIGIN=http://localhost:3000 \
  voice-email-ai
```

## Model Configuration

### Whisper Models

Available models (trade-off between speed and accuracy):
- `tiny` - Fastest, least accurate (~1GB RAM)
- `base` - Good balance (~1GB RAM) **[Default]**
- `small` - Better accuracy (~2GB RAM)
- `medium` - High accuracy (~5GB RAM)
- `large` - Best accuracy (~10GB RAM)

Set in `.env`:
```
WHISPER_MODEL=base
```

### Transformers Cache

Models are cached in `./models` directory by default. Change with:
```
TRANSFORMERS_CACHE=./models
```

## Performance Tips

1. **GPU Acceleration**: Install PyTorch with CUDA support for faster processing
2. **Model Size**: Use smaller Whisper models for faster responses
3. **Rate Limiting**: Adjust `RATE_LIMIT_PER_MINUTE` based on your needs
4. **Caching**: Consider adding Redis for distributed rate limiting

## Troubleshooting

### Import Errors
```bash
# Ensure all dependencies installed
pip install -r requirements.txt
```

### Model Download Fails
```bash
# Set proxy if needed
export HTTP_PROXY=http://proxy:port
pip install --upgrade transformers whisper
```

### Out of Memory
- Use smaller Whisper model (`tiny` or `base`)
- Reduce batch size or concurrent requests
- Add more RAM or use GPU

### Audio Format Issues
```bash
# Install ffmpeg
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: Download from ffmpeg.org
```

## Testing

```bash
# Run tests
pytest

# Test health endpoint
curl http://localhost:5000/health

# Test speech-to-text (with sample audio)
curl -X POST http://localhost:5000/api/speech-to-text \
  -H "Content-Type: application/json" \
  -d '{"audio": "YOUR_BASE64_AUDIO", "language": "en"}'
```

## Production Considerations

1. **Security**
   - Use HTTPS in production
   - Set specific CORS origins (not `*`)
   - Implement authentication/API keys
   - Add request validation

2. **Scalability**
   - Use Redis for rate limiting across instances
   - Consider model serving platforms (TorchServe, TensorFlow Serving)
   - Load balance multiple instances
   - Use CDN for static assets

3. **Monitoring**
   - Add logging (structured JSON logs)
   - Monitor model inference times
   - Track error rates and types
   - Set up alerting

## License

MIT License - see parent project for details

## Support

For issues specific to the AI backend, check:
- Model loading errors → check disk space and memory
- Slow inference → use smaller models or GPU
- Audio format errors → verify ffmpeg installation

For general project issues, see the main [README](../README.md) and [DEVELOPMENT_LOG](../DEVELOPMENT_LOG.md).
