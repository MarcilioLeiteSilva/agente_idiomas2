FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files and enable buffering
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Crucial for module resolution when running from /app
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from the backend folder (context is root)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend content into /app
# This includes app/, core/, services/, repositories/, etc.
COPY backend/ .

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

# Default database URL (Easypanel will override this if configured)
ENV DATABASE_URL=sqlite:////app/data/app.db

# Expose FastAPI port
EXPOSE 8000

# Command matches the structure where app/ is directly under /app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
