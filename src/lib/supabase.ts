import { createClient } from '@supabase/supabase-js'
import { BoundingBox, SegmentationPolygon, ConfidenceScores, ApiUsage, UserCorrections } from '@/types/api'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required. Please check your .env.local file.')
}

if (!supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Server-side client with service role key for admin operations
// Only create this on the server side, not in the browser
let _supabaseServer: ReturnType<typeof createClient> | null = null

export function getSupabaseServer() {
  if (typeof window !== 'undefined') {
    // We're on the client side, return null or throw an error
    throw new Error('supabaseServer can only be used on the server side')
  }
  
  if (!_supabaseServer) {
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations. Please check your .env.local file and ensure you have the service role key from your Supabase project settings.')
    }
    
    _supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey)
  }
  
  return _supabaseServer
}

// For backwards compatibility, but this should only be used on the server side
export const supabaseServer = (() => {
  if (typeof window !== 'undefined') {
    // We're on the client side, return null
    return null
  }
  
  try {
    return getSupabaseServer()
  } catch (error) {
    console.error('Failed to initialize Supabase server client:', error)
    console.error('Please ensure you have set up your .env.local file with the required Supabase environment variables.')
    console.error('Check SETUP.md for detailed instructions.')
    return null
  }
})() as ReturnType<typeof createClient> | null

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          subscription_tier: 'free' | 'premium' | 'enterprise'
          api_usage_count: number
          api_usage_reset_date: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'premium' | 'enterprise'
          api_usage_count?: number
          api_usage_reset_date?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          subscription_tier?: 'free' | 'premium' | 'enterprise'
          api_usage_count?: number
          api_usage_reset_date?: string
        }
      }
      images: {
        Row: {
          id: string
          user_id: string | null
          original_filename: string | null
          file_path: string
          file_size: number | null
          mime_type: string | null
          width: number | null
          height: number | null
          hash: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          original_filename?: string | null
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          width?: number | null
          height?: number | null
          hash: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          original_filename?: string | null
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          width?: number | null
          height?: number | null
          hash?: string
          created_at?: string
        }
      }
      analysis_results: {
        Row: {
          id: string
          image_id: string
          user_id: string | null
          model: string
          analysis_mode: string
          description: string | null
          bounding_boxes: BoundingBox[] | null
          segmentation_polygons: SegmentationPolygon[] | null
          confidence_scores: ConfidenceScores | null
          processing_time_ms: number | null
          token_usage: ApiUsage | null
          created_at: string
        }
        Insert: {
          id?: string
          image_id: string
          user_id?: string | null
          model: string
          analysis_mode: string
          description?: string | null
          bounding_boxes?: BoundingBox[] | null
          segmentation_polygons?: SegmentationPolygon[] | null
          confidence_scores?: ConfidenceScores | null
          processing_time_ms?: number | null
          token_usage?: ApiUsage | null
          created_at?: string
        }
        Update: {
          id?: string
          image_id?: string
          user_id?: string | null
          model?: string
          analysis_mode?: string
          description?: string | null
          bounding_boxes?: BoundingBox[] | null
          segmentation_polygons?: SegmentationPolygon[] | null
          confidence_scores?: ConfidenceScores | null
          processing_time_ms?: number | null
          token_usage?: ApiUsage | null
          created_at?: string
        }
      }
      training_data: {
        Row: {
          id: string
          image_id: string
          user_id: string | null
          ground_truth_boxes: BoundingBox[] | null
          ground_truth_labels: string[] | null
          user_corrections: UserCorrections | null
          feedback_score: number | null
          is_approved_for_training: boolean
          created_at: string
        }
        Insert: {
          id?: string
          image_id: string
          user_id?: string | null
          ground_truth_boxes?: BoundingBox[] | null
          ground_truth_labels?: string[] | null
          user_corrections?: UserCorrections | null
          feedback_score?: number | null
          is_approved_for_training?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          image_id?: string
          user_id?: string | null
          ground_truth_boxes?: BoundingBox[] | null
          ground_truth_labels?: string[] | null
          user_corrections?: UserCorrections | null
          feedback_score?: number | null
          is_approved_for_training?: boolean
          created_at?: string
        }
      }
    }
  }
} 