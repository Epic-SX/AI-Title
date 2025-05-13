# Product Image Analysis Backend

A Flask-based backend that integrates with Perplexity AI to analyze product images and extract valuable information.

## Features

- Image upload and processing
- Product image analysis using Perplexity AI
- Extraction of brand, color, product name, material, and other information
- RESTful API

## Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   ```

2. Activate the virtual environment:
   ```
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the development server:
   ```
   python wsgi.py
   ```

## API Endpoints

### Upload and Analyze Images

**Endpoint**: `POST /api/images/analyze`

**Request**:
- Content-Type: `multipart/form-data`
- Body: `images` (multiple files)

**Response**:
```json
{
  "raw_response": "...",
  "status": "success"
}
```

## Environment Variables

The application uses the following environment variables:

- `PERPLEXITY_API_KEY` - Your Perplexity AI API key 