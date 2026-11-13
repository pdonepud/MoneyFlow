import { NextResponse } from "next/server";
import { ADVISOR_INSTRUCTIONS, buildAdvisorFacts, isAdvisorContext } from "@/lib/advisor";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 48_000;
const MAX_MESSAGE_CHARS = 1500;
const MAX_OUTPUT_TOKENS = 450;

export async function POST(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({error:"Expected JSON request."},{status:415});
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) return NextResponse.json({error:"Request too large."},{status:413});
  let payload: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return NextResponse.json({error:"Request too large."},{status:413});
    payload = JSON.parse(body);
  } catch { return NextResponse.json({error:"Invalid JSON request."},{status:400}); }
  if (!payload || typeof payload !== "object") return NextResponse.json({error:"Invalid request."},{status:400});
  const { message, context } = payload as Record<string,unknown>;
  if (typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_CHARS || !isAdvisorContext(context)) {
    return NextResponse.json({error:"Invalid message or financial context."},{status:400});
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({error:"AI advisor is not configured on the server."},{status:503});
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),15_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},
      body:JSON.stringify({
        model:process.env.OPENAI_ADVISOR_MODEL || "gpt-4.1-mini",
        instructions:ADVISOR_INSTRUCTIONS,
        input:[{role:"user",content:buildAdvisorFacts(context)+"\n\nUser question:\n"+message.trim()}],
        max_output_tokens:MAX_OUTPUT_TOKENS,
        store:false
      }),
      signal:controller.signal
    });
    if (!response.ok) return NextResponse.json({error:"AI provider request failed. Try again later."},{status:502});
    const data:unknown=await response.json();
    const output = data && typeof data==="object" && "output" in data ? (data as {output?:unknown}).output : null;
    let answer="";
    if(Array.isArray(output)){
      for(const item of output){
        if(item && typeof item==="object" && "content" in item && Array.isArray(item.content)){
          for(const part of item.content){
            if(part && typeof part==="object" && part.type==="output_text" && typeof part.text==="string") answer+=part.text;
          }
        }
      }
    }
    if(!answer.trim()) return NextResponse.json({error:"AI returned no answer. Try again."},{status:502});
    return NextResponse.json({answer:answer.trim()});
  }catch{
    return NextResponse.json({error:"AI request timed out or failed."},{status:502});
  }finally{clearTimeout(timeout);}
}
