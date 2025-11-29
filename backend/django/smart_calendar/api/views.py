import json

from django.db import connection, models
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def func(request):
    # TODO:
    # returning all or exact events from DB in JSON format
    return JsonResponse({})


def dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


@csrf_exempt
def exec_sql_request(request):
    raw_data = request.body
    try:
        data_dict = json.loads(raw_data)
    except json.JSONDecodeError:
        return JsonResponse({"message": "invalid dictionary"})
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
                    result["error"] = "recommendation, lol"
                case _:
                    result["error"] = {
                        "message": "Error: No such method",
                        "method": type_sql_request,
                    }

    return JsonResponse(result)
