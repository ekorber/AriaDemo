FROM node:20-slim AS frontend
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ .
RUN npm run build

FROM python:3.14-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install .
COPY . .
COPY --from=frontend /app/client/dist /app/client/dist
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
