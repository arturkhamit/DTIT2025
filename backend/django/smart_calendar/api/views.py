import json

from db.models import Event
from django.core import serializers
from django.core.exceptions import ObjectDoesNotExist
from django.db import DatabaseError, connection
from django.db.models import ProtectedError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def get_events(request):
    year = request.GET.get("year")
    month = request.GET.get("month")
    if not year or not month:
        return JsonResponse(
            {"status": "error", "message": "There is year or month"}, status=400
        )

    events = Event.objects.filter(
        start_date__year=int(year), start_date__month=int(month)
    )

    json_string = serializers.serialize("json", events)
    result = json.loads(json_string)
    return JsonResponse(result, safe=False)


@csrf_exempt
def get_event(request):
    id = request.get("id")
    if not id:
        return JsonResponse(
            {"status": "error", "message": "There is no id"}, status=400
        )

    events = Event.objects.get(id=int(id))

    json_string = serializers.serialize("json", events)
    result = json.loads(json_string)
    return JsonResponse(result, safe=False)


@csrf_exempt
def delete_event(request):
    print(request)
    id = request.GET.get("id")
    if not id:
        return JsonResponse(
            {"status": "error", "message": "There is no id"}, status=400
        )

    try:
        Event.objects.filter(id=id).delete()
    except ObjectDoesNotExist:
        return JsonResponse(
            {"status": "error", "message": f"There is no row with id {id}"}, status=400
        )
    except ProtectedError:
        return JsonResponse(
            {"status": "error", "message": f"Failed to delete row {id}"}, status=400
        )

    return JsonResponse({"status": "success"}, status=200)


@csrf_exempt
def create_event(request):
    data = json.loads(request.body)
    name = data.get("name")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    description = data.get("description")
    category = data.get("category")
    if not name or not start_date or not end_date or not category:
        return JsonResponse(
            {
                "status": "error",
                "message": f"Not enough parameters. [{name}, {start_date}, {end_date}, {description}, {category}]",
            },
            status=400,
        )

    try:
        Event.objects.create(
            name=name,
            start_date=start_date,
            end_date=end_date,
            description=description,
            category=category,
        )
    except DatabaseError:
        return JsonResponse(
            {"status": "error", "message": "Database error"}, status=400
        )
    except Exception as e:
        return JsonResponse({"status": "error", "message": f"{e}"}, status=400)

    return JsonResponse({"status": "success"}, status=200)


@csrf_exempt
def update_event(request):
    id = request.GET.get("id")
    if not id:
        return JsonResponse(
            {"status": "error", "message": "There is no id"}, status=400
        )

    data = json.loads(request.body)
    name = data.get("name")
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    description = data.get("description")
    category = data.get("category")

    try:
        event = Event.objects.get(id=id)
        if name:
            event.name = name
        if start_date:
            event.start_date = start_date
        if end_date:
            event.end_date = end_date
        if description:
            event.description = description
        if category:
            event.category = category

        event.save()

    except ObjectDoesNotExist:
        return JsonResponse(
            {"status": "error", "message": f"There is no row with id {id}"}, status=400
        )
    except ProtectedError:
        return JsonResponse(
            {"status": "error", "message": f"Failed to delete row {id}"}, status=400
        )

    return JsonResponse({"status": "success"}, status=200)


def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


@csrf_exempt
def exec_sql_request(request):
    raw_data = request.body
    try:
        data_dict = json.loads(raw_data)
    except json.JSONDecodeError:
        return JsonResponse(
            {"status": "error", "message": "Invalid dictionary"}, status=400
        )
    print(data_dict)
    result = {}

    for action in data_dict["actions"]:
        type_sql_request = action["type"]

        sql_request = action["sql"]

        with connection.cursor() as cursor:
            match type_sql_request:
                case "select":
                    cursor.execute(sql_request)
                    result["fetched_data"] = dictfetchall(cursor)

                case "create":
                    try:
                        cursor.execute(sql_request)
                        result["message"] = "Insert executed successfully"
                    except Exception as e:
                        result["error"] = str(e)
                case "update":
                    try:
                        cursor.execute(sql_request)
                        result["message"] = (
                            f"Update executed. Rows affected: {cursor.rowcount}"
                        )
                    except Exception as e:
                        result["error"] = str(e)
                case "delete":
                    try:
                        cursor.execute(sql_request)
                        result["message"] = (
                            f"Delete executed. Rows affected: {cursor.rowcount}"
                        )
                    except Exception as e:
                        result["error"] = str(e)
                case "recommendation":
                    try:
                        cursor.execute(sql_request)
                        result["message"] = "reccomendation success"
                        result["fetched_data"] = dictfetchall(cursor)
                    except Exception as e:
                        result["error"] = str(e)
                case _:
                    result["error"] = {
                        "message": "Error: No such method",
                        "method": type_sql_request,
                    }

    return JsonResponse(result)
