import { NextResponse } from "next/server";
import { ADVISOR_INSTRUCTIONS, buildAdvisorFacts, isAdvisorContext, type AdvisorContext } from "@/lib/advisor";
import { createClient } from "@supabase/supabase-js";
import { monthKey } from "@/lib/obligations";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 48_000;
const MAX_MESSAGE_CHARS = 1500;
const MAX_OUTPUT_TOKENS = 450;

async function authenticatedContext(request:Request):Promise<AdvisorContext> {
  const header=request.headers.get("authorization")??"";
  if(!/^Bearer [A-Za-z0-9._-]+$/.test(header)) throw new Error("Unauthorized");
  const token=header.slice(7);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Supabase not configured");
  const client=createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{headers:{Authorization:`Bearer ${token}`}}
  });
  const {data:auth,error:authError}=await client.auth.getUser(token);
  if(authError||!auth.user)throw new Error("Unauthorized");
  const id=auth.user.id;
  const [b,o,g,f]=await Promise.all([
    client.from("budget_settings").select("balance_cents,buffer_cents").eq("user_id",id).maybeSingle(),
    client.from("obligations").select("id,name,category,amount_cents,due_day,paid_for_month").eq("user_id",id),
    client.from("savings_goals").select("id,name,target_cents,saved_cents").eq("user_id",id),
    client.from("financing_scenarios").select("price_cents,down_payment_cents,apr_percent,term_months,insurance_cents,fuel_cents,maintenance_cents").eq("user_id",id).maybeSingle()
  ]);
  if(b.error||o.error||g.error||f.error)throw new Error("Unable to load account data.");
  const context:AdvisorContext={
    month:monthKey(),
    budget:b.data?{balanceCents:Number(b.data.balance_cents),bufferCents:Number(b.data.buffer_cents)}:null,
    obligations:(o.data??[]).map(r=>({
      id:r.id,name:r.name,category:r.category,amountCents:Number(r.amount_cents),
      dueDay:Number(r.due_day),paidForMonth:r.paid_for_month
    })),
    goals:(g.data??[]).map(r=>({
      id:r.id,name:r.name,targetCents:Number(r.target_cents),savedCents:Number(r.saved_cents)
    })),
    financing:f.data?{
      priceCents:Number(f.data.price_cents),downPaymentCents:Number(f.data.down_payment_cents),
      aprPercent:Number(f.data.apr_percent),termMonths:Number(f.data.term_months),
      insuranceCents:Number(f.data.insurance_cents),fuelCents:Number(f.data.fuel_cents),
      maintenanceCents:Number(f.data.maintenance_cents)
    }:null
  };
  if(!isAdvisorContext(context))throw new Error("Invalid account financial data.");
  return context;
}

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
  const { message } = payload as Record<string,unknown>;
  if (typeof message !== "string" || !message.trim() || message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({error:"Invalid message or financial context."},{status:400});
  }
  let context:AdvisorContext;
  try { context=await authenticatedContext(request); }
  catch(e) {
    const unauthorized=e instanceof Error&&e.message==="Unauthorized";
    return NextResponse.json({error:unauthorized?"Sign in to use the AI advisor.":"Unable to load account financial data."},
      {status:unauthorized?401:503});
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
