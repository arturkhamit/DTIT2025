from django.urls import path

from .views import exec_sql_request, get_events

urlpatterns = [
    path(
        "exec_sql_request/",
        exec_sql_request,
        name="exec-sql-request",
    ),
    path("get_events/", get_events, name="get_events"),
]
