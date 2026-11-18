import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request:NextRequest) {
  let response=NextResponse.next({request});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) return response;
  const supabase=createServerClient(url,key,{
    cookies:{
      getAll(){return request.cookies.getAll();},
      setAll(items){
        items.forEach(({name,value})=>request.cookies.set(name,value));
        response=NextResponse.next({request});
        items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      }
    }
  });
  // Refresh expired tokens and verify identity on every protected page request.
  const {data,error}=await supabase.auth.getUser();
  if(request.nextUrl.pathname==="/" && (error||!data.user)){
    const login=request.nextUrl.clone();
    login.pathname="/login";
    login.search="";
    const redirect=NextResponse.redirect(login);
    // Keep any refreshed auth cookies from the response.
    response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
