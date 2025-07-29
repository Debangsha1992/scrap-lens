import { supabaseServer } from './supabase'
import { cacheImageMetadata, getCachedImageMetadata } from './redis'
import { CachedImageMetadata } from '@/types/api'
import crypto from 'crypto'

export interface ImageMetadata {
  id: string
  original_filename: string | null
  file_path: string
  file_size: number | null
  mime_type: string | null
  width: number | null
  height: number | null
  hash: string
  user_id: string | null
  created_at: string
}

export async function generateImageHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  return crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex')
}

// Helper functions to convert between ImageMetadata and CachedImageMetadata
function toCachedImageMetadata(imageMetadata: ImageMetadata): CachedImageMetadata {
  return {
    filename: imageMetadata.original_filename || 'unknown',
    size: imageMetadata.file_size || 0,
    mimeType: imageMetadata.mime_type || 'unknown',
    width: imageMetadata.width || undefined,
    height: imageMetadata.height || undefined,
    hash: imageMetadata.hash,
    uploadedAt: imageMetadata.created_at
  }
}

export async function storeImage(
  file: File,
  userId?: string
): Promise<ImageMetadata> {
  try {
    // Check if supabaseServer is available
    if (!supabaseServer) {
      throw new Error('Supabase server client is not available')
    }

    // Generate hash for deduplication
    const hash = await generateImageHash(file)
    
    // Check if image already exists in cache first
    const cachedImage = await getCachedImageMetadata(hash)
    if (cachedImage) {
      // Convert cached metadata back to ImageMetadata format
      const imageFromCache = await getImageByHash(hash)
      if (imageFromCache) {
        return imageFromCache
      }
    }
    
    // Check if image already exists in database
    const existingImage = await getImageByHash(hash)
    if (existingImage) {
      // Cache the existing image metadata
      await cacheImageMetadata(hash, toCachedImageMetadata(existingImage))
      return existingImage
    }
    
    // Get image dimensions
    const { width, height } = await getImageDimensions(file)
    
    // Store in Supabase Storage
    const fileName = `${hash}.${file.name.split('.').pop()}`
    const filePath = `images/${userId || 'anonymous'}/${fileName}`
    
    console.log('Attempting to upload to Supabase Storage:', filePath)
    
    const { data, error } = await supabaseServer.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Supabase Storage error:', error)
      throw new Error(`Storage error: ${error.message}`)
    }
    
    console.log('Successfully uploaded to storage:', data.path)
    
    // Create metadata object
    const imageMetadata: Omit<ImageMetadata, 'created_at'> = {
      id: crypto.randomUUID(),
      original_filename: file.name,
      file_path: data.path,
      file_size: file.size,
      mime_type: file.type,
      width,
      height,
      hash,
      user_id: userId || null
    }
    
    console.log('Attempting to store metadata in database')
    
    // Store metadata in database
    const { data: dbData, error: dbError } = await supabaseServer
      .from('images')
      .insert(imageMetadata)
      .select()
      .single()
    
    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file if database insertion fails
      await supabaseServer.storage.from('images').remove([data.path])
      throw new Error(`Database error: ${dbError.message}`)
    }
    
    console.log('Successfully stored metadata in database')
    
    const fullMetadata = dbData as unknown as ImageMetadata
    
    // Cache the new image metadata
    await cacheImageMetadata(hash, toCachedImageMetadata(fullMetadata))
    
    return fullMetadata
  } catch (error) {
    console.error('Error storing image:', error)
    throw error
  }
}

export async function getImageByHash(hash: string): Promise<ImageMetadata | null> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return null
    }

    const { data, error } = await supabaseServer
      .from('images')
      .select('*')
      .eq('hash', hash)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching image by hash:', error)
      return null
    }
    
    return (data as unknown as ImageMetadata) || null
  } catch (error) {
    console.error('Error in getImageByHash:', error)
    return null
  }
}

export async function getImageById(id: string): Promise<ImageMetadata | null> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return null
    }

    const { data, error } = await supabaseServer
      .from('images')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching image by ID:', error)
      return null
    }
    
    return data as unknown as ImageMetadata
  } catch (error) {
    console.error('Error in getImageById:', error)
    return null
  }
}

export async function getUserImages(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ImageMetadata[]> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return []
    }

    const { data, error } = await supabaseServer
      .from('images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching user images:', error)
      return []
    }
    
    return (data as unknown as ImageMetadata[]) || []
  } catch (error) {
    console.error('Error in getUserImages:', error)
    return []
  }
}

export async function deleteImage(imageId: string, userId?: string): Promise<boolean> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return false
    }

    // Get image metadata
    const image = await getImageById(imageId)
    if (!image) {
      return false
    }
    
    // Verify ownership if userId is provided
    if (userId && image.user_id !== userId) {
      console.error('User does not own this image')
      return false
    }
    
    // Delete from storage
    const { error: storageError } = await supabaseServer.storage
      .from('images')
      .remove([image.file_path])
    
    if (storageError) {
      console.error('Error deleting from storage:', storageError)
    }
    
    // Delete from database
    const { error: dbError } = await supabaseServer
      .from('images')
      .delete()
      .eq('id', imageId)
    
    if (dbError) {
      console.error('Error deleting from database:', dbError)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error in deleteImage:', error)
    return false
  }
}

export async function getImageUrl(filePath: string): Promise<string | null> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return null
    }

    const { data } = await supabaseServer.storage
      .from('images')
      .createSignedUrl(filePath, 3600) // 1 hour expiry
    
    return data?.signedUrl || null
  } catch (error) {
    console.error('Error creating signed URL:', error)
    return null
  }
}

async function getImageDimensions(_file: File): Promise<{ width: number; height: number }> {
  try {
    // For server-side execution, we'll return default dimensions
    // In a production environment, you'd use a library like 'sharp' or 'image-size'
    // For now, returning sensible defaults to avoid the Image constructor error
    return { width: 800, height: 600 }
  } catch (error) {
    console.warn('Failed to get image dimensions, using defaults:', error)
    return { width: 800, height: 600 }
  }
}

export async function getStorageStats(userId: string): Promise<{
  totalImages: number
  totalSize: number
  storageUsed: string
}> {
  try {
    if (!supabaseServer) {
      console.error('Supabase server client is not available')
      return { totalImages: 0, totalSize: 0, storageUsed: '0 B' }
    }

    const { data, error } = await supabaseServer
      .from('images')
      .select('file_size')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error fetching storage stats:', error)
      return { totalImages: 0, totalSize: 0, storageUsed: '0 B' }
    }
    
    const images = data as unknown as { file_size: number | null }[]
    const totalImages = images.length
    const totalSize = images.reduce((sum: number, img) => sum + (img.file_size || 0), 0)
    const storageUsed = formatBytes(totalSize)
    
    return { totalImages, totalSize, storageUsed }
  } catch (error) {
    console.error('Error in getStorageStats:', error)
    return { totalImages: 0, totalSize: 0, storageUsed: '0 B' }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 