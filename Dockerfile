FROM python:3.14-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install .
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Note: .env is passed via env_file in docker-compose.yml, not baked into the image
