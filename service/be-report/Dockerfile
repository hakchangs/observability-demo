FROM harbor.platform.local/dockerhub/library/python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir setuptools && \
    pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]