from django.urls import path

from .views import (
    create_event,
    delete_event,
    exec_sql_request,
    get_event,
    get_events,
    update_event,
)

urlpatterns = [
    path(
        "exec_sql_request/",
        exec_sql_request,
        name="exec-sql-request",
    ),
    path("get_events/", get_events, name="get_events"),
    path("get_event/", get_event, name="get_event"),
    path("create_event/", create_event, name="create_event"),
    path("update_event/", update_event, name="update_event"),
    path("delete_event/", delete_event, name="delete_event"),
]
