from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from pymongo import MongoClient

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from langgraph.graph import StateGraph, MessagesState, START
from langgraph.checkpoint.mongodb import MongoDBSaver

from app.core.config import settings

router = APIRouter()

THREAD_ID = "default_user"


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=settings.GROQ_API_KEY,
    temperature=0.3,
    max_retries=2,
)


mongo_client = MongoClient(settings.MONGODB_URI)

checkpointer = MongoDBSaver(
    mongo_client,
    db_name=settings.MONGODB_DB_NAME,
    checkpoint_collection_name=settings.MONGODB_CHECKPOINT_COLLECTION,
    writes_collection_name=settings.MONGODB_WRITES_COLLECTION,
)


def call_model(state: MessagesState):
    system_message = SystemMessage(
        content=(
            "You are a helpful assistant for answering coding questions and generate codes . "
            "Use the previous conversation history when relevant. "
            "Provide clear and concise answers. If you don't know the answer, say you don't know."
        )
    )

    response = llm.invoke(
        [system_message] + state["messages"]
    )

    return {
        "messages": [response]
    }


builder = StateGraph(MessagesState)

builder.add_node("call_model", call_model)
builder.add_edge(START, "call_model")

graph = builder.compile(checkpointer=checkpointer)


def get_config():
    return {
        "configurable": {
            "thread_id": THREAD_ID
        }
    }


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        result = graph.invoke(
            {
                "messages": [
                    HumanMessage(content=request.message)
                ]
            },
            config=get_config(),
        )

        last_message = result["messages"][-1]

        return ChatResponse(
            reply=last_message.content
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory")
def get_memory():
    try:
        state = graph.get_state(get_config())
        messages = state.values.get("messages", [])

        return {
            "messages": [
                {
                    "type": message.type,
                    "content": message.content,
                }
                for message in messages
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory")
def clear_memory():
    try:
        checkpointer.delete_thread(THREAD_ID)

        return {
            "message": "Memory cleared"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 