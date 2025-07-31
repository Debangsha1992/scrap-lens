import { User } from '@supabase/supabase-js'
import { supabase, supabaseServer } from './supabase'
import { NextRequest } from 'next/server'
import { UserProfile } from '@/types/auth'

export const subscriptionLimits = {
  free: { 
    daily_requests: 10, 
    monthly_requests: 100,
    max_image_size: 10 * 1024 * 1024, // 10MB
    max_storage: 100 * 1024 * 1024     // 100MB
  },
  premium: { 
    daily_requests: 100, 
    monthly_requests: 2000,
    max_image_size: 50 * 1024 * 1024,  // 50MB
    max_storage: 10 * 1024 * 1024 * 1024 // 10GB
  },
  enterprise: { 
    daily_requests: 1000, 
    monthly_requests: 20000,
    max_image_size: 100 * 1024 * 1024, // 100MB
    max_storage: 100 * 1024 * 1024 * 1024 // 100GB
  }
}

export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  try {
    // Get the session token from the request
    const token = request.cookies.get('sb-access-token')?.value
    
    if (!token) {
      return null
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return null
    }

    const { data, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error || !data) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as unknown as UserProfile
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

export async function createUserProfile(user: User): Promise<UserProfile | null> {
  try {
    const newProfile = {
      id: user.id,
      email: user.email!,
      subscription_tier: 'free' as const,
      api_usage_count: 0,
      api_usage_reset_date: new Date().toISOString(),
    }

    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return null
    }

    const { data, error } = await supabaseServer
      .from('users')
      .insert(newProfile)
      .select()
      .single()

    if (error || !data) {
      console.error('Error creating user profile:', error)
      return null
    }

    return data as unknown as UserProfile
  } catch (error) {
    console.error('Error in createUserProfile:', error)
    return null
  }
}

export async function updateUserApiUsage(userId: string): Promise<boolean> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return false
    }

    // Get current user first
    const { data: currentUser, error: fetchError } = await supabaseServer
      .from('users')
      .select('api_usage_count')
      .eq('id', userId)
      .single()
    
    if (fetchError) {
      console.error('Error fetching current user:', fetchError)
      return false
    }

    // Update with incremented value
    const { error } = await supabaseServer
      .from('users')
      .update({ 
        api_usage_count: ((currentUser as { api_usage_count: number }).api_usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      console.error('Error updating user API usage:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserApiUsage:', error)
    return false
  }
}

export async function checkUserLimits(profile: UserProfile): Promise<{
  canProceed: boolean
  reason?: string
  remainingRequests?: number
}> {
  try {
    const limits = subscriptionLimits[profile.subscription_tier]
    
    // Check if usage needs to be reset (daily)
    const resetDate = new Date(profile.api_usage_reset_date)
    const now = new Date()
    const hoursSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60)
    
    let currentUsage = profile.api_usage_count
    
    // Reset daily usage if more than 24 hours have passed
    if (hoursSinceReset >= 24) {
      await resetUserApiUsage(profile.id)
      currentUsage = 0
    }
    
    const remainingRequests = limits.daily_requests - currentUsage
    
    if (remainingRequests <= 0) {
      return {
        canProceed: false,
        reason: `Daily limit of ${limits.daily_requests} requests exceeded. Upgrade your plan for higher limits.`,
        remainingRequests: 0
      }
    }
    
    return {
      canProceed: true,
      remainingRequests
    }
  } catch (error) {
    console.error('Error checking user limits:', error)
    return {
      canProceed: false,
      reason: 'Error checking usage limits'
    }
  }
}

export async function resetUserApiUsage(userId: string): Promise<boolean> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return false
    }

    const { error } = await supabaseServer
      .from('users')
      .update({
        api_usage_count: 0,
        api_usage_reset_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      console.error('Error resetting user API usage:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in resetUserApiUsage:', error)
    return false
  }
}

export async function updateUserSubscription(
  userId: string, 
  tier: 'free' | 'premium' | 'enterprise'
): Promise<boolean> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return false
    }

    const { error } = await supabaseServer
      .from('users')
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      console.error('Error updating user subscription:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserSubscription:', error)
    return false
  }
}

// Helper function to get or create user profile
export async function getOrCreateUserProfile(user: User): Promise<UserProfile | null> {
  let profile = await getUserProfile(user.id)
  
  if (!profile) {
    profile = await createUserProfile(user)
  }
  
  return profile
} 