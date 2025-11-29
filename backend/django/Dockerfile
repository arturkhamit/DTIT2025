FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /smart_calendar

COPY requirements.txt /smart_calendar/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /smart_calendar/

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
