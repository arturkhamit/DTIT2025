from django.db import models


# create table event (
#     id bigint primary key,
#     start_date timestamptz not null,
#     end_date timestamptz not null,
#     event_name text not null,
#     description text,
#     color text
# )
class Event(models.Model):
    id = models.BigAutoField(
        primary_key=True, unique=True, verbose_name="id of an event"
    )

    start_date = models.DateTimeField(verbose_name="starting date and time of an event")
    end_date = models.DateTimeField(verbose_name="ending date and time of an event")

    event_name = models.TextField(verbose_name="name of an event")
    decsription = models.TextField(verbose_name="description of an event")

    color = models.TextField(verbose_name="displayed color of an event")
