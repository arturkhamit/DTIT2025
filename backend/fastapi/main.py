from datetime import datetime
from typing import List

import httpx
import requests
from fastapi import FastAPI, HTTPException, Request, status
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


# class Event(BaseModel):
#     name: str
#     start_date: datetime
#     end_date: datetime
#     category: str
#     description: str


@app.get("/event/get/{id}")
async def get_event(id: int):
    django_url = f"{DJANGO_BACKEND_URL}/get_event/"
    params = {"id": id}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(django_url, params=params)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Django Error: {response.text}",
            )

        return response.json()

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the Django backend.",
        )


@app.delete("/event/delete/{id}")
async def delete_event(id: int):
    django_url = f"{DJANGO_BACKEND_URL}/delete_event/"
    params = {"id": id}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(django_url, params=params)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Django Error: {response.text}",
            )

        return response.json()

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the Django backend.",
        )


@app.post("/event/create/")
async def create_event(request: Request):
    django_url = f"{DJANGO_BACKEND_URL}/create_event/"

    try:
        body = await request.body()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                django_url,
                content=body,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Django Error: {response.text}",
            )

        return response.json()

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the Django backend.",
        )


@app.patch("/event/update/{id}")
async def update_event(id: int, request: Request):
    django_url = f"{DJANGO_BACKEND_URL}/update_event/"

    try:
        body = await request.json()

        async with httpx.AsyncClient() as client:
            response = await client.patch(django_url, params={"id": id}, json=body)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Django Error: {response.text}",
            )

        return response.json()

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to the Django backend.",
        )


# structure for a single SQL action
class SQLAction(BaseModel):
    type: str = Field(..., description="select, insert, update, or delete")
    sql: str = Field(..., description="The raw SQL query")


# the body structure that Django expects
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

        return response.json()

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
