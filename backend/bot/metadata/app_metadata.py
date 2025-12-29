APP_METADATA = {
    "domains": {
        "agriculture": {
            "description": "General farming and agriculture related knowledge",
            "handled_by": "llm_knowledge",
        },
        "application": {
            "description": "WMS application data queries",
            "handled_by": "app_pipeline",
        },
        "greeting": {
            "description": "Greetings and casual conversation",
            "handled_by": "llm_smalltalk",
        },
    },
    # =========================
    # APPLICATION ENTITIES
    # =========================
    "entities": {
        "worker": {
            "model": "Worker",
            "primary_key": "_id",
            "searchable_fields": ["name", "status"],
            "fields": {
                "name": {"type": "string"},
                "status": {"type": "enum", "values": ["active", "inactive"]},
                "remarks": {"type": "string"},
                "createdAt": {"type": "date"},
                "updatedAt": {"type": "date"},
            },
            "relationships": {
                "attendance": {"entity": "attendance", "via": "workerId"},
                "advance": {"entity": "advance", "via": "workerId"},
                "extra": {"entity": "extra", "via": "workerId"},
                "settlement": {"entity": "settlement", "via": "workerId"},
            },
        },
        "attendance": {
            "model": "Attendance",
            "primary_key": "_id",
            "searchable_fields": ["date"],
            "fields": {
                "date": {"type": "date"},
                "startTime": {"type": "time"},
                "endTime": {"type": "time"},
                "hoursWorked": {"type": "number"},
                "rate": {"type": "number"},
                "total": {"type": "number"},
                "remarks": {"type": "string"},
                "isSettled": {"type": "boolean"},
            },
            "relationships": {"worker": {"entity": "worker", "via": "workerId"}},
        },
        "advance": {
            "model": "Advance",
            "primary_key": "_id",
            "searchable_fields": ["date", "isSettled"],
            "fields": {
                "date": {"type": "date"},
                "amount": {"type": "number"},
                "note": {"type": "string"},
                "isSettled": {"type": "boolean"},
            },
            "relationships": {
                "worker": {"entity": "worker", "via": "workerId"},
                "settlement": {"entity": "settlement", "via": "settlementId"},
            },
        },
        "extra": {
            "model": "Extra",
            "primary_key": "_id",
            "searchable_fields": ["date", "itemName"],
            "fields": {
                "itemName": {"type": "string"},
                "price": {"type": "number"},
                "date": {"type": "date"},
                "note": {"type": "string"},
                "isSettled": {"type": "boolean"},
            },
            "relationships": {
                "worker": {"entity": "worker", "via": "workerId"},
                "settlement": {"entity": "settlement", "via": "settlementId"},
            },
        },
        "settlement": {
            "model": "Settlement",
            "primary_key": "_id",
            # Fields that users are most likely to query/filter on
            "searchable_fields": [
                "startDate",
                "endDate",
                "netAmount",
                "farmerId",
                "workerId",
            ],
            # Exact fields from Mongo schema
            "fields": {
                "startDate": {
                    "type": "date",
                    "description": "Settlement period start date",
                },
                "endDate": {
                    "type": "date",
                    "description": "Settlement period end date",
                },
                "attendanceTotal": {
                    "type": "number",
                    "description": "Total earned from attendance",
                },
                "extrasTotal": {
                    "type": "number",
                    "description": "Total extra expenses",
                },
                "advancesTotal": {
                    "type": "number",
                    "description": "Total advances deducted",
                },
                "netAmount": {
                    "type": "number",
                    "description": "Final payable amount after deductions",
                },
                "note": {"type": "string", "description": "Optional settlement note"},
                "createdAt": {
                    "type": "date",
                    "description": "Settlement creation timestamp",
                },
                "updatedAt": {
                    "type": "date",
                    "description": "Settlement update timestamp",
                },
            },
            # Entity relationships for intent resolution
            "relationships": {
                "worker": {
                    "entity": "worker",
                    "via": "workerId",
                    "description": "Settlement belongs to a worker",
                },
                "farmer": {
                    "entity": "farmer",
                    "via": "farmerId",
                    "description": "Settlement belongs to a farmer",
                },
            },
            # Supported query patterns (VERY important for LLM)
            "supported_queries": [
                "list settlements",
                "latest settlement",
                "settlement summary",
                "total settlement amount",
                "settlement between dates",
                "worker settlement details",
            ],
        },
        "farmer": {
            "model": "Farmer",
            "primary_key": "_id",
            "searchable_fields": ["name", "email"],
            "fields": {"name": {"type": "string"}, "email": {"type": "string"}},
        },
    },
}
