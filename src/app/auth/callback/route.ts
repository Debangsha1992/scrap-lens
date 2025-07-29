import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${requestUrl.origin}/?error=auth_error`)
      }
      
      // Successful authentication, redirect to home
      return NextResponse.redirect(`${requestUrl.origin}/`)
    } catch (error) {
      console.error('Authentication callback error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_error`)
    }
  }

  // No code provided, redirect to home
  return NextResponse.redirect(`${requestUrl.origin}/`)
} 