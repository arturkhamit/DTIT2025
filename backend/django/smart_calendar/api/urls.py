from django.urls import path

from .views import events, exec_sql_request

urlpatterns = [
    path(
        "exec_sql_request/",
        exec_sql_request,
        name="exec-sql-request",
    ),
    path("events/", events, name="events"),
]
