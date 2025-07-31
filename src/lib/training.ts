import { supabaseServer } from './supabase'
import { BoundingBox, UserCorrections, ConfidenceScores, ApiUsage, TrainingDataExport } from '@/types/api'

export interface TrainingData {
  id?: string
  image_id: string
  user_id: string | null
  ground_truth_boxes: BoundingBox[] | null
  ground_truth_labels: string[] | null
  user_corrections: UserCorrections | null
  feedback_score: number | null
  is_approved_for_training: boolean
  created_at?: string
}

export interface AnalysisResult {
  id?: string
  image_id: string
  user_id: string | null
  model: string
  analysis_mode: string
  description: string | null
  bounding_boxes: BoundingBox[] | null
  segmentation_polygons: null
  confidence_scores: ConfidenceScores | null
  processing_time_ms: number | null
  token_usage: ApiUsage | null
  created_at?: string
}

export async function storeAnalysisResult(data: {
  imageId: string
  userId?: string
  model: string
  analysisMode: string
  result: { description: string; boxes?: BoundingBox[]; usage?: ApiUsage }
  processingTime: number
}): Promise<AnalysisResult | null> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return null
    }

    const analysisData: Omit<AnalysisResult, 'id' | 'created_at'> = {
      image_id: data.imageId,
      user_id: data.userId || null,
      model: data.model,
      analysis_mode: data.analysisMode,
      description: data.result.description || null,
      bounding_boxes: data.result.boxes || null,
      segmentation_polygons: null,
      confidence_scores: extractConfidenceScores(data.result),
      processing_time_ms: data.processingTime,
      token_usage: data.result.usage || null
    }

    const { data: dbData, error } = await supabaseServer
      .from('analysis_results')
      .insert(analysisData)
      .select()
      .single()

    if (error) {
      console.error('Error storing analysis result:', error)
      return null
    }

    return dbData as unknown as AnalysisResult
  } catch (error) {
    console.error('Error in storeAnalysisResult:', error)
    return null
  }
}

export async function submitTrainingData(data: {
  imageId: string
  userId?: string
  groundTruthBoxes?: BoundingBox[]
  groundTruthLabels?: string[]
  userCorrections?: UserCorrections
  feedbackScore: number
}): Promise<boolean> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return false
    }

    const trainingData: Omit<TrainingData, 'id' | 'created_at'> = {
      image_id: data.imageId,
      user_id: data.userId || null,
      ground_truth_boxes: data.groundTruthBoxes || null,
      ground_truth_labels: data.groundTruthLabels || null,
      user_corrections: data.userCorrections || null,
      feedback_score: data.feedbackScore,
      is_approved_for_training: false // Requires manual approval
    }

    const { error } = await supabaseServer
      .from('training_data')
      .insert(trainingData)

    if (error) {
      console.error('Error submitting training data:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in submitTrainingData:', error)
    return false
  }
}

export async function getUserAnalysisHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<AnalysisResult[]> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return []
    }

    const { data, error } = await supabaseServer
      .from('analysis_results')
      .select(`
        *,
        images (
          original_filename,
          file_path,
          width,
          height
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching user analysis history:', error)
      return []
    }

    return (data || []) as unknown as AnalysisResult[]
  } catch (error) {
    console.error('Error in getUserAnalysisHistory:', error)
    return []
  }
}

export async function getTrainingDataForExport(
  userId?: string,
  approvedOnly: boolean = true
): Promise<TrainingDataExport[]> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return []
    }

    let query = supabaseServer
      .from('training_data')
      .select(`
        *,
        images (
          file_path,
          width,
          height,
          original_filename
        )
      `)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (approvedOnly) {
      query = query.eq('is_approved_for_training', true)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching training data:', error)
      return []
    }

    // Format data for model training
    return formatTrainingData((data || []) as unknown as TrainingDataExport[])
  } catch (error) {
    console.error('Error in getTrainingDataForExport:', error)
    return []
  }
}

export async function approveTrainingData(dataId: string): Promise<boolean> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return false
    }

    const { error } = await supabaseServer
      .from('training_data')
      .update({ is_approved_for_training: true })
      .eq('id', dataId)

    if (error) {
      console.error('Error approving training data:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in approveTrainingData:', error)
    return false
  }
}

export async function getAnalyticsData(userId?: string): Promise<{
  totalAnalyses: number
  totalImages: number
  modelUsage: Record<string, number>
  dailyUsage: Array<{ date: string; count: number }>
  topObjects: Array<{ label: string; count: number }>
  averageProcessingTime: number
}> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return { totalAnalyses: 0, totalImages: 0, modelUsage: {}, dailyUsage: [], topObjects: [], averageProcessingTime: 0 }
    }

    let query = supabaseServer.from('analysis_results').select('*')
    
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching analytics data:', error)
      return {
        totalAnalyses: 0,
        totalImages: 0,
        modelUsage: {},
        dailyUsage: [],
        topObjects: [],
        averageProcessingTime: 0
      }
    }

    // Process analytics data
    const typedData = data as unknown as AnalysisResult[]
    const totalAnalyses = typedData.length
    const uniqueImageIds = new Set(typedData.map((item: AnalysisResult) => item.image_id))
    const totalImages = uniqueImageIds.size

    // Model usage statistics
    const modelUsage: Record<string, number> = {}
    typedData.forEach((item: AnalysisResult) => {
      modelUsage[item.model] = (modelUsage[item.model] || 0) + 1
    })

    // Daily usage (last 30 days)
    const dailyUsage = calculateDailyUsage(typedData)

    // Top detected objects
    const topObjects = calculateTopObjects(typedData)

    // Average processing time
    const processingTimes = typedData
      .filter((item: AnalysisResult) => item.processing_time_ms)
      .map((item: AnalysisResult) => item.processing_time_ms!)
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum: number, time: number) => sum + time, 0) / processingTimes.length
      : 0

    return {
      totalAnalyses,
      totalImages,
      modelUsage,
      dailyUsage,
      topObjects,
      averageProcessingTime
    }
  } catch (error) {
    console.error('Error in getAnalyticsData:', error)
    return {
      totalAnalyses: 0,
      totalImages: 0,
      modelUsage: {},
      dailyUsage: [],
      topObjects: [],
      averageProcessingTime: 0
    }
  }
}

function extractConfidenceScores(result: { boxes?: BoundingBox[] }): ConfidenceScores | null {
  const scores: ConfidenceScores = {}
  
  if (result.boxes) {
    scores.boxes = result.boxes.map((box: BoundingBox) => box.confidence || 0)
  }
  
  // Calculate overall confidence
  const allScores = [...(scores.boxes || [])]
  if (allScores.length > 0) {
    scores.overall = allScores.reduce((sum, score) => sum + score, 0) / allScores.length
  }
  
  return Object.keys(scores).length > 0 ? scores : null
}

function formatTrainingData(rawData: TrainingDataExport[]): TrainingDataExport[] {
  return rawData.map(item => ({
    id: item.id,
    imageId: item.imageId,
    userId: item.userId,
    groundTruthBoxes: item.groundTruthBoxes || [],
    groundTruthLabels: item.groundTruthLabels || [],
    userCorrections: item.userCorrections,
    feedbackScore: item.feedbackScore || 0,
    isApprovedForTraining: item.isApprovedForTraining || false,
    createdAt: item.createdAt
  }))
}

function calculateDailyUsage(data: AnalysisResult[]): Array<{ date: string; count: number }> {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split('T')[0]
  }).reverse()

  const usageByDate: Record<string, number> = {}
  
  data.forEach((item: AnalysisResult) => {
    const date = new Date(item.created_at!).toISOString().split('T')[0]
    usageByDate[date] = (usageByDate[date] || 0) + 1
  })

  return last30Days.map(date => ({
    date,
    count: usageByDate[date] || 0
  }))
}

function calculateTopObjects(data: AnalysisResult[]): Array<{ label: string; count: number }> {
  const objectCounts: Record<string, number> = {}

  data.forEach((item: AnalysisResult) => {
    if (item.bounding_boxes) {
      item.bounding_boxes.forEach((box: BoundingBox) => {
        const label = box.label.toLowerCase()
        objectCounts[label] = (objectCounts[label] || 0) + 1
      })
    }
    
    // Segmentation functionality removed
  })

  return Object.entries(objectCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }))
} 