import json
import re
from datetime import datetime, timezone
from time import perf_counter

from app.agents import (
    build_reader_agent,
    writer_chain,
    critic_chain
)
from app.tools import format_search_results, search_web


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_stage(
    key: str,
    title: str,
    description: str,
    runner,
    summary_builder=None,
):
    started_at = utc_now_iso()
    stage_started = perf_counter()
    result = runner()
    duration_ms = int((perf_counter() - stage_started) * 1000)

    stage = {
        "key": key,
        "title": title,
        "description": description,
        "started_at": started_at,
        "completed_at": utc_now_iso(),
        "duration_ms": duration_ms,
    }

    if summary_builder is not None:
        stage["summary"] = summary_builder(result)

    return result, stage

def parse_feedback(feedback: str) -> dict:
    try:
        parsed = json.loads(feedback)
        if isinstance(parsed, dict):
            return {
                "score": parsed.get("score"),
                "out_of": parsed.get("out_of", 10),
                "strengths": parsed.get("strengths", []),
                "areas_to_improve": parsed.get("areas_to_improve", []),
                "verdict": parsed.get("verdict", ""),
            }
    except json.JSONDecodeError:
        pass

    score_match = re.search(r"Score:\s*(\d+)(?:\s*/\s*(\d+))?", feedback, re.IGNORECASE)
    verdict_match = re.search(
        r"One line verdict:\s*(.+)",
        feedback,
        re.IGNORECASE | re.DOTALL,
    )

    def parse_section(section_name: str, next_sections: list[str]) -> list[str]:
        boundary = "|".join(next_sections)
        pattern = rf"{section_name}:\s*(.*?)(?=\n(?:{boundary}):|\Z)"
        match = re.search(pattern, feedback, re.IGNORECASE | re.DOTALL)
        if not match:
            return []
        return [
            line.strip()[2:].strip()
            for line in match.group(1).splitlines()
            if line.strip().startswith("-")
        ]

    return {
        "score": int(score_match.group(1)) if score_match else None,
        "out_of": int(score_match.group(2)) if score_match and score_match.group(2) else 10,
        "strengths": parse_section("Strengths", ["Areas to Improve", "One line verdict"]),
        "areas_to_improve": parse_section("Areas to Improve", ["One line verdict"]),
        "verdict": verdict_match.group(1).strip() if verdict_match else feedback.strip(),
    }

def run_research_pipeline(topic: str) -> dict:
    state = {}
    pipeline_started_at = utc_now_iso()
    pipeline_started = perf_counter()
    stages = []

    #search agent working
    print("\n"+" ="*50)
    print("step 1 - search agent is working ...")
    print("="*50)

    state["search_results"], search_stage = build_stage(
        key="search",
        title="Search the web",
        description="Collect recent, reliable, high-signal sources for the topic.",
        runner=lambda: search_web(
            query=f"Find recent, reliable and detailed information about: {topic}"
        ),
        summary_builder=lambda results: (
            f"Collected {len(results)} source candidates."
            if isinstance(results, list)
            else "Collected search results."
        ),
    )
    stages.append(search_stage)
    formatted_search_results = format_search_results(state["search_results"])

    print("\n search result ", state["search_results"])

    #step 2 - reader agent
    print("\n"+" ="*50)
    print("step 2 - Reader agent is scraping top resources ...")
    print("="*50)

    reader_agent = build_reader_agent()
    reader_result, reader_stage = build_stage(
        key="scrape",
        title="Read and scrape",
        description="Select the strongest source and extract detailed page content.",
        runner=lambda: reader_agent.invoke({
            "messages": [("user",
                f"Based on the following search results about '{topic}', "
                f"pick the most relevant URL and scrape it for deeper content.\n\n"
                f"Search Results:\n{formatted_search_results[:800]}"
            )]
        }),
        summary_builder=lambda _: "Reader agent selected a source and scraped the page.",
    )
    stages.append(reader_stage)

    state['scraped_content'] = reader_result['messages'][-1].content

    print("\nscraped content: \n", state['scraped_content'])

    #step 3 - writer chain

    print("\n"+" ="*50)
    print("step 3 - Writer is drafting the report ...")
    print("="*50)

    research_combined = (
        f"SEARCH RESULTS : \n {formatted_search_results} \n\n"
        f"DETAILED SCRAPED CONTENT : \n {state['scraped_content']}"
    )

    state["report"], writer_stage = build_stage(
        key="write",
        title="Draft report",
        description="Synthesize the gathered material into a structured research brief.",
        runner=lambda: writer_chain.invoke({
            "topic" : topic,
            "research" : research_combined
        }),
        summary_builder=lambda report: (
            f"Drafted a {len(report.split())}-word report."
            if isinstance(report, str)
            else "Drafted the research report."
        ),
    )
    stages.append(writer_stage)

    print("\n Final Report\n",state['report'])

    #critic report 

    print("\n"+" ="*50)
    print("step 4 - critic is reviewing the report ")
    print("="*50)

    raw_feedback, critic_stage = build_stage(
        key="critique",
        title="Review output",
        description="Score the brief and capture strengths, risks, and improvement notes.",
        runner=lambda: critic_chain.invoke({
            "report":state['report']
        }),
        summary_builder=lambda _: "Generated structured quality feedback for the report.",
    )
    stages.append(critic_stage)
    state["feedback"] = parse_feedback(raw_feedback)

    print("\n critic report \n", state['feedback'])

    state["pipeline"] = {
        "started_at": pipeline_started_at,
        "completed_at": utc_now_iso(),
        "total_duration_ms": int((perf_counter() - pipeline_started) * 1000),
        "stages": stages,
    }

    return state



if __name__ == "__main__":
    topic = input("\n Enter a research topic : ")
    run_research_pipeline(topic)
