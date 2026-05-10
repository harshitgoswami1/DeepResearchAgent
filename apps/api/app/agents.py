from langchain.agents import create_agent
from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from app.tools import (
    web_search , scrape_url
) 
from dotenv import load_dotenv

load_dotenv()

#model setup 
llm = ChatMistralAI(model = "mistral-medium-3-5", temperature=0) #USE ANY MODEL AVAILABLE


#1st agent 
def build_search_agent():
    return create_agent(
        model = llm,
        tools= [web_search]
    )

#2nd agent 

def build_reader_agent():
    return create_agent(
        model = llm,
        tools = [scrape_url]
    )


#writer chain 

writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
    ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional."""),
])

writer_chain = writer_prompt | llm | StrOutputParser()

#critic_chain 

critic_prompt = ChatPromptTemplate.from_messages([
     ("system", "You are a sharp and constructive research critic. Be honest and specific."),
    ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond with valid JSON only. Do not wrap it in markdown fences.

Use this exact schema:
{{
  "score": 0,
  "out_of": 10,
  "strengths": ["..."],
  "areas_to_improve": ["..."],
  "verdict": "..."
}}"""),
])

critic_chain = critic_prompt | llm | StrOutputParser()
