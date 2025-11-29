from typing import List

import requests
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI()

DJANGO_BACKEND_URL = "http://django-app:8000/api"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Structure for a single SQL action
class SQLAction(BaseModel):
    type: str = Field(..., description="select, insert, update, or delete")
    sql: str = Field(..., description="The raw SQL query")


# Matches the body structure your Django view expects
class SQLRequest(BaseModel):
    actions: List[SQLAction]


@app.get("/events/")
def get_events(year: int, month: int):
    django_url = f"{DJANGO_BACKEND_URL}/get_events/"
    params = {"year": year, "month": month}

    try:
        response = requests.get(django_url, params=params)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Django Error: {response.text}",
            )

        return response.text

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the Django.",
        )


@app.post("/exec-sql/")
def execute_sql(payload: SQLRequest):
    django_url = f"{DJANGO_BACKEND_URL}/exec_sql_request/"

    try:
        response = requests.post(django_url, json=payload.dict())

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Django Error: {response.text}",
            )

        return response.json()

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not connect to the Django Backend.",
        )
