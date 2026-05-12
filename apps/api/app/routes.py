from fastapi import APIRouter
from pydantic import BaseModel

from app.pipeline import run_research_pipeline

router = APIRouter()

class ResearchRequest(BaseModel):
    topic: str


@router.post("/research")
async def research(request: ResearchRequest):

    result = run_research_pipeline(request.topic)

    return {
        "topic": request.topic,
        "search_results": result["search_results"],
        "scraped_content": result["scraped_content"],
        "report": result["report"],
        "feedback": result["feedback"],
        "pipeline": result["pipeline"],
    }
