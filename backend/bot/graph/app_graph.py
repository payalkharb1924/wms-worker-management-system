# graph/app_graph.py
from langgraph.graph import StateGraph, END
from typing import TypedDict, Any

from graph.app_flow import handle_app_query
from services.llm import generate_app_response


# 🔹 Graph state definition
class AppState(TypedDict):
    intent: dict
    user: dict
    data: dict | None
    reply: str | None


# 🔹 Node: fetch + normalize data
async def fetch_data_node(state: AppState) -> AppState:
    result = await handle_app_query(state["intent"], state["user"])
    return {
        **state,
        "data": result.get("data"),
        "reply": result.get("reply"),
    }


# 🔹 Build LangGraph
def build_app_graph():
    graph = StateGraph(AppState)

    graph.add_node("fetch_app_data", fetch_data_node)

    graph.set_entry_point("fetch_app_data")
    graph.add_edge("fetch_app_data", END)

    return graph.compile()


# 🔹 Singleton graph instance
app_graph = build_app_graph()
