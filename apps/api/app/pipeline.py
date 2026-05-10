import json
import re

from app.agents import (
    build_reader_agent,
    writer_chain,
    critic_chain
)
from app.tools import format_search_results, search_web

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

    #search agent working
    print("\n"+" ="*50)
    print("step 1 - search agent is working ...")
    print("="*50)

    state["search_results"] = search_web(
        query=f"Find recent, reliable and detailed information about: {topic}"
    )
    formatted_search_results = format_search_results(state["search_results"])

    print("\n search result ", state["search_results"])

    #step 2 - reader agent
    print("\n"+" ="*50)
    print("step 2 - Reader agent is scraping top resources ...")
    print("="*50)

    reader_agent = build_reader_agent()
    reader_result = reader_agent.invoke({
        "messages": [("user",
            f"Based on the following search results about '{topic}', "
            f"pick the most relevant URL and scrape it for deeper content.\n\n"
            f"Search Results:\n{formatted_search_results[:800]}"
        )]
    })

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

    state["report"] = writer_chain.invoke({
        "topic" : topic,
        "research" : research_combined
    })

    print("\n Final Report\n",state['report'])

    #critic report 

    print("\n"+" ="*50)
    print("step 4 - critic is reviewing the report ")
    print("="*50)

    raw_feedback = critic_chain.invoke({
        "report":state['report']
    })
    state["feedback"] = parse_feedback(raw_feedback)

    print("\n critic report \n", state['feedback'])

    return state



if __name__ == "__main__":
    topic = input("\n Enter a research topic : ")
    run_research_pipeline(topic)
