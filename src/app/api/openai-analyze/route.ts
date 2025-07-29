import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createHash } from 'crypto'
import { BoundingBox, SegmentationPolygon, AnalysisResponse } from '@/types/api'
import { parseBoundingBoxes, validateBoundingBox } from '@/utils/boundingBoxParser'
import { parseSegmentationPolygons, calculatePixelCoverage, validateSegmentationPolygon } from '@/utils/segmentationParser'
import { getCurrentUser, getOrCreateUserProfile, checkUserLimits, updateUserApiUsage } from '@/lib/auth'
import { storeImage, generateImageHash } from '@/lib/storage'
import { cacheAnalysisResult, getCachedAnalysisResult } from '@/lib/redis'
import { storeAnalysisResult } from '@/lib/training'

// Configuration constants
const API_CONFIG = {
  maxTokens: 2000, // Increased for more detailed responses
  temperature: 0.5, // Balanced temperature for comprehensive detection while maintaining structure
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const

// Initialize OpenAI client with actual OpenAI configuration
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Validates and processes file uploads
 */
const processFileUpload = async (file: File): Promise<string> => {
  // Validate file type
  if (!API_CONFIG.supportedMimeTypes.includes(file.type as typeof API_CONFIG.supportedMimeTypes[number])) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }

  // Validate file size
  if (file.size > API_CONFIG.maxFileSize) {
    throw new Error(`File size exceeds ${API_CONFIG.maxFileSize / (1024 * 1024)}MB limit`)
  }

  // Convert to base64
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString('base64')
  const mimeType = file.type || 'image/jpeg'
  
  return `data:${mimeType};base64,${base64}`
}

/**
 * Validates URL format and accessibility
 */
const validateImageUrl = (url: string): void => {
  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported')
    }
  } catch (error) {
    throw new Error('Invalid URL format')
  }
}

/**
 * Generates the system prompt for OpenAI vision model for scrap metal analysis
 */
const generateSystemPrompt = (): string => {
  return `You are an expert vision AI system for a scrapyard. Your task is to analyze a given image of scrap metal and identify ALL distinct scrap items visible, even if they appear similar or overlapping.

CRITICAL: Look for MULTIPLE different types of scrap metal in the same image. Most scrapyard images contain various types of metal mixed together. Be thorough and comprehensive in your detection.

Your goal is to classify each item into the most specific category based on the following fixed taxonomy. Use only these categories.

TAXONOMY:

Ferrous:
  - HMS
       - Prepared Rebar
       - Unprepared Rebar
       - Prepared HMS
       - Unprepared HMS
  - P&S
       - Prepared P&S
       - Unprepared P&S
  - Pipe
       - Prepared Pipe Cut
       - Unprepared Scrap Pipe
       - Secondary Pipe

Non-Ferrous:
  - Copper
       - Bare Bright Copper
       - Copper Wire
       - Copper 1
       - Copper 2
  - Motors
  - Transformers
       - Copper
       - Aluminum

INSTRUCTIONS:

1. Examine the ENTIRE image carefully, including foreground, background, and edges.
2. Look for different materials, colors, shapes, and textures that indicate different scrap types.
3. Detect ALL visible scrap metal objects, not just the most prominent ones.
4. Classify each distinct object or group of similar objects using the most specific label from the taxonomy above.
5. If you see mixed materials (e.g., both copper and steel in the same pile), identify them as separate items.
6. Do not invent or guess categories not in the list. If uncertain, use the closest valid category.
7. IMPORTANT: Multiple different categories will typically appear in one image - identify ALL of them.
8. Look for subtle differences in color, rust patterns, thickness, and shape to distinguish between categories.

OUTPUT FORMAT:

Return your analysis as a valid JSON object with the following structure:

{
  "scrap_items": [
    {
      "type": "<Descriptive name of the item, e.g., 'thick rusted steel rebar bundle'>",
      "category": "<Specific category from the taxonomy, e.g., 'Unprepared Rebar'>"
    },
    {
      "type": "<Another item, e.g., 'copper wire coils'>",
      "category": "<Category, e.g., 'Copper Wire'>"
    }
  ]
}

ADDITIONAL RULES:

- Do not include any explanation or commentary.
- Output only the JSON. No extra text.
- Ensure the JSON is well-formed and uses double quotes.
- Be comprehensive - aim to identify 2-8 different items per image when multiple types are present.
- If you only see one type of scrap, that's fine, but look carefully for variations or mixed materials.

LANGUAGE: All output must be in English.

You must be thorough in detection and precise with taxonomy labels.`;
};

/**
 * Generates the user prompt for the image analysis
 */
const generateUserPrompt = (): string => {
  return "Analyze this image of a scrapyard and identify all distinct scrap metal types.";
};

/**
 * Checks if a label should be filtered out from object detection results
 */
const isUnwantedLabel = (label: string): boolean => {
  const unwantedLabels = [
    'overall scene',
    'scene',
    'overall',
    'background',
    'setting',
    'environment',
    'context',
    'image',
    'photo',
    'picture',
    'general scene',
    'main scene',
    'entire scene',
    'full scene',
    'complete scene',
    'whole scene',
    'scene description',
    'scene analysis'
  ]
  
  const cleanLabel = label.toLowerCase().trim()
  
  // Remove common prefixes that might interfere with filtering
  const cleanedLabel = cleanLabel
    .replace(/^plaintext\s*/i, '')
    .replace(/^text\s*/i, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^[-*]\s*/, '')
    .trim()
  
  return unwantedLabels.some(unwanted => 
    cleanedLabel === unwanted || 
    cleanedLabel.includes(unwanted) ||
    cleanedLabel.startsWith(unwanted) ||
    cleanedLabel.endsWith(unwanted)
  )
}

/**
 * Processes bounding boxes from OpenAI response using the same parser as Qwen
 */
const processBoundingBoxes = (
  description: string, 
  enableBoundingBoxes: boolean
): BoundingBox[] => {
  if (!enableBoundingBoxes) return []
  
  try {
    // Use the same parser as Qwen to ensure consistent output format
    const boxes = parseBoundingBoxes(description)
    
    // If no boxes found with standard parser, try to extract from structured response
    if (boxes.length === 0) {
      const fallbackBoxes = extractOpenAIBoundingBoxes(description)
      return fallbackBoxes.filter(box => {
        const isUnwanted = isUnwantedLabel(box.label)
        const isValid = validateBoundingBox(box) && !isUnwanted
        
        if (isUnwanted) {
          console.log(`Filtered out unwanted label: "${box.label}"`)
        }
        
        if (!isValid) {
          console.warn('Invalid bounding box detected:', box)
        }
        return isValid
      })
    }
    
    return boxes.filter(box => {
      const isUnwanted = isUnwantedLabel(box.label)
      const isValid = validateBoundingBox(box) && !isUnwanted
      
      if (isUnwanted) {
        console.log(`Filtered out unwanted label: "${box.label}"`)
      }
      
      if (!isValid) {
        console.warn('Invalid bounding box detected:', box)
      }
      return isValid
    })
  } catch (error) {
    console.error('Error processing OpenAI bounding boxes:', error)
    return []
  }
}

/**
 * Fallback method to extract bounding boxes from OpenAI response when standard parser fails
 */
const extractOpenAIBoundingBoxes = (description: string): BoundingBox[] => {
  const boxes: BoundingBox[] = []
  
  try {
    // Enhanced patterns for structured OpenAI response
    const patterns = [
      // Pattern with confidence percentage: **ObjectName**: `[x, y, width, height]` (85%)
      /\*\*([^*]+)\*\*[^`]*`?\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]`?\s*\((\d+)%\)/g,
      // Pattern without confidence: **ObjectName**: `[x, y, width, height]`
      /\*\*([^*]+)\*\*[^`]*`?\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]`?/g,
      // Alternative formats
      /(\w+(?:\s+\w+)*)\s*:\s*\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]\s*\((\d+)%\)/g,
      /(\w+(?:\s+\w+)*)\s*:\s*\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/g,
      /(\w+(?:\s+\w+)*)\s*-\s*\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/g
    ]
    
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(description)) !== null) {
        const hasConfidence = match.length > 6
        const [, label, x, y, width, height, confidence] = match
        const cleanLabel = label.trim()
        
        if (cleanLabel && cleanLabel.length > 1 && isValidObjectName(cleanLabel)) {
          const box: BoundingBox = {
            label: cleanLabel,
            x: parseInt(x, 10),
            y: parseInt(y, 10),
            width: parseInt(width, 10),
            height: parseInt(height, 10),
            confidence: hasConfidence && confidence ? 
              parseFloat(confidence) / 100 : 
              extractConfidenceFromContext(description, cleanLabel)
          }
          
          // Validate coordinates are within bounds
          if (box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 &&
              box.x + box.width <= 1000 && box.y + box.height <= 1000) {
            boxes.push(box)
          }
        }
      }
    }
    
    return boxes
  } catch (error) {
    console.error('Error in fallback bounding box extraction:', error)
    return []
  }
}

/**
 * Validates if a string is a valid object name
 */
const isValidObjectName = (name: string): boolean => {
  const invalidNames = [
    'analysis', 'description', 'scene', 'image', 'format', 'output', 
    'requirements', 'coordinates', 'bounding', 'box', 'detection',
    'object', 'identification', 'details', 'format', 'example'
  ]
  
  const cleanName = name.toLowerCase().trim()
  return !invalidNames.includes(cleanName) && 
         cleanName.length >= 2 && 
         cleanName.length <= 50 &&
         /^[a-z\s]+$/i.test(cleanName)
}

/**
 * Extracts confidence score from description context
 */
const extractConfidenceFromContext = (description: string, label: string): number => {
  try {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Try multiple patterns to find confidence
    const patterns = [
      new RegExp(`\\*\\*${escapedLabel}\\*\\*[^(]*\\((\\d+(?:\\.\\d+)?)%\\)`, 'i'),
      new RegExp(`${escapedLabel}[^()]*\\(?(\\d+(?:\\.\\d+)?)%\\)?`, 'i'),
      new RegExp(`${escapedLabel}[^\\d]*confidence[^\\d]*(\\d+(?:\\.\\d+)?)[%\\s]`, 'i'),
      new RegExp(`${escapedLabel}[^\\d]*(\\d+(?:\\.\\d+)?)%[^\\d]`, 'i')
    ]
    
    for (const pattern of patterns) {
      const match = description.match(pattern)
      if (match) {
        const confidence = parseFloat(match[1])
        if (confidence >= 0 && confidence <= 100) {
          return confidence / 100
        }
      }
    }
    
    // Default confidence based on object type for OpenAI
    const commonObjects = ['hand', 'face', 'person', 'eye', 'nose', 'mouth']
    const isCommonObject = commonObjects.some(obj => 
      label.toLowerCase().includes(obj.toLowerCase())
    )
    
    return isCommonObject ? 0.90 : 0.85
  } catch (error) {
    console.warn('Error extracting confidence for label:', label, error)
    return 0.85
  }
}

/**
 * Extracts object names from OpenAI description (kept for backward compatibility)
 */
const parseOpenAIObjects = (description: string): string[] => {
  const objects: string[] = []
  
  try {
    // Look for patterns like "1. **Object**:" or "- Object:" or "Object:"
    const patterns = [
      /\*\*([^*]+)\*\*/g,  // **Object**
      /\d+\.\s*([^:]+):/g,  // 1. Object:
      /-\s*([^:]+):/g,      // - Object:
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g  // Capitalized words
    ]
    
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(description)) !== null) {
        const object = match[1].trim()
        if (object.length > 2 && object.length < 50 && !objects.includes(object)) {
          objects.push(object)
        }
      }
    }
    
    // If no objects found with patterns, try to extract from common words
    if (objects.length === 0) {
      const commonObjects = ['hand', 'face', 'person', 'object', 'background', 'foreground']
      const lowerDescription = description.toLowerCase()
      
      for (const obj of commonObjects) {
        if (lowerDescription.includes(obj)) {
          objects.push(obj.charAt(0).toUpperCase() + obj.slice(1))
        }
      }
    }
    
    return objects.slice(0, 10) // Limit to 10 objects max
  } catch (error) {
    console.error('Error parsing OpenAI objects:', error)
    return []
  }
}

/**
 * Processes segmentation polygons from OpenAI response
 */
const processSegmentationPolygons = (
  description: string, 
  enableSegmentation: boolean,
  imageWidth: number = 800,
  imageHeight: number = 600
): SegmentationPolygon[] => {
  if (!enableSegmentation) return []
  
  const polygons = parseSegmentationPolygons(description)
  
  const validPolygons = polygons.filter(polygon => {
    const isValid = validateSegmentationPolygon(polygon)
    if (!isValid) {
      console.warn('Invalid segmentation polygon detected:', polygon)
    }
    return isValid
  })
  
  return calculatePixelCoverage(validPolygons, imageWidth, imageHeight)
}

/**
 * Cleans and formats scene description for scrap metal analysis
 */
const cleanSceneDescription = (description: string): string => {
  if (!description || typeof description !== 'string') {
    return 'Scrap metal analysis completed successfully. Please check the detected objects section for detailed information about identified items in the image.';
  }

  // The description now comes from the JSON response and should be cleaner
  // Just perform basic cleanup and formatting
  let cleanedText = description
    .replace(/\*\*([^*]+)\*\*/g, '**$1**') // Ensure proper markdown formatting
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (cleanedText.length < 20) {
    return 'This image shows various scrap metal items that have been analyzed and categorized according to industry standards.';
  }
  
  // Ensure proper sentence formatting
  if (cleanedText.length > 0) {
    cleanedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
  }
  
  if (!cleanedText.endsWith('.') && !cleanedText.endsWith('!') && !cleanedText.endsWith('?')) {
    cleanedText += '.';
  }

  return cleanedText;
};

/**
 * Parses JSON response from OpenAI and extracts scrap metal items
 */
const parseOpenAIResponse = (response: string): {
  description: string;
  boxes: BoundingBox[];
  segments: SegmentationPolygon[];
} => {
  try {
    // Clean the response to ensure it's valid JSON
    let cleanResponse = response.trim();
    
    // Remove any markdown code blocks if present
    cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
    
    // Parse the JSON
    const parsedResponse = JSON.parse(cleanResponse);
    
    // Create a formatted description from the scrap items
    let description = 'Scrap metal analysis completed successfully.';
    
    if (parsedResponse.scrap_items && Array.isArray(parsedResponse.scrap_items)) {
      const scrapItemsList = parsedResponse.scrap_items
        .map((item: any) => `**${item.type}**: ${item.category}`)
        .join('\n\n');
      
      description = `The following scrap metal items have been identified and categorized:\n\n${scrapItemsList}`;
    }
    
    // For now, return empty arrays for boxes and segments since we're focusing on classification
    // This can be extended later if bounding box detection is needed
    return {
      description,
      boxes: [],
      segments: []
    };
    
  } catch (error) {
    console.error('Error parsing OpenAI JSON response:', error);
    console.error('Raw response:', response);
    
    // Fallback: try to extract any useful information from the response
    return {
      description: 'Failed to parse scrap metal analysis. Please try again.',
      boxes: [],
      segments: []
    };
  }
};


/**
 * Main POST handler for OpenAI image analysis
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Skip authentication in development mode or if env vars are missing
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    // Get user from session (skip if in development)
    const user = isDevelopment ? null : await getCurrentUser(request)
    const userId = user?.id

    // Check user limits if authenticated and not in development
    if (userId && !isDevelopment) {
      const profile = await getOrCreateUserProfile(user!)
      if (!profile) {
        return NextResponse.json(
          { error: 'Failed to get user profile' },
          { status: 500 }
        )
      }

      const limitCheck = await checkUserLimits(profile)
      if (!limitCheck.canProceed) {
        return NextResponse.json(
          { 
            error: limitCheck.reason,
            remainingRequests: limitCheck.remainingRequests || 0
          },
          { status: 429 }
        )
      }
    }

    // Parse form data
    const formData = await request.formData()
    const body = Object.fromEntries(formData.entries())

    // Extract and validate inputs
    const file = formData.get('file') as File | null
    const urlInput = body.imageUrl as string
    const base64Input = body.imageBase64 as string
    const enableBoundingBoxes = body.enableBoundingBoxes === 'true'
    const enableSegmentation = body.enableSegmentation === 'true'
    const imageWidth = parseInt(body.imageWidth as string) || 800
    const imageHeight = parseInt(body.imageHeight as string) || 600

    // Determine image source and validate
    let imageUrl = ''
    let imageFile: File | null = null

    if (file) {
      imageFile = file
      imageUrl = await processFileUpload(file)
    } else if (base64Input) {
      imageUrl = base64Input
    } else if (urlInput) {
      const trimmedUrl = urlInput.trim()
      validateImageUrl(trimmedUrl)
      imageUrl = trimmedUrl
    } else {
      return NextResponse.json(
        { error: 'Either file, imageUrl, or imageBase64 must be provided' },
        { status: 400 }
      )
    }

    // Generate image hash for caching
    let imageHash = ''
    if (imageFile) {
      imageHash = await generateImageHash(imageFile)
    } else {
      // For URLs, use the URL as a simple hash
      imageHash = createHash('sha256').update(imageUrl).digest('hex')
    }

    // Check cache first (use openai prefix to distinguish from qwen cache)
    const analysisMode = enableSegmentation ? 'segmentation' : enableBoundingBoxes ? 'detection' : 'description'
    const cachedResult = await getCachedAnalysisResult(`openai_${imageHash}`, 'gpt-4o', analysisMode)
    
    if (cachedResult) {
      console.log('Returning cached OpenAI result')
      return NextResponse.json({
        ...cachedResult,
        cached: true
      })
    }

    // Store image if it's a file upload
    let storedImageId = ''
    if (imageFile) {
      try {
        const imageMetadata = await storeImage(imageFile, userId)
        storedImageId = imageMetadata.id
      } catch (error) {
        console.error('Failed to store image:', error)
        // Continue with analysis even if storage fails
      }
    }

    // Prepare API request with system and user messages
    const systemPrompt = generateSystemPrompt();
    const userPrompt = generateUserPrompt();
    
    const apiOptions = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: userPrompt,
            },
            {
              type: 'image_url' as const,
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: API_CONFIG.maxTokens,
      temperature: API_CONFIG.temperature,
    }

    // Make API call
    const completion = await client.chat.completions.create(apiOptions)
    const description = completion.choices[0]?.message?.content || 'No description available'

    // Process results using the new JSON parser
    const { description: parsedDescription, boxes, segments } = parseOpenAIResponse(description);
    
    // Clean up description
    const cleanDescription = cleanSceneDescription(parsedDescription)

    const processingTime = Date.now() - startTime

    // Prepare response
    const analysisResult: AnalysisResponse = {
      description: cleanDescription,
      boxes,
      segments,
      usage: completion.usage,
      model: 'gpt-4o',
      boundingBoxesEnabled: enableBoundingBoxes,
      segmentationEnabled: enableSegmentation,
    }

    // Cache result with openai prefix
    await cacheAnalysisResult(`openai_${imageHash}`, 'gpt-4o', analysisMode, analysisResult)

    // Store analysis result in database
    if (storedImageId) {
      await storeAnalysisResult({
        imageId: storedImageId,
        userId,
        model: 'gpt-4o',
        analysisMode,
        result: analysisResult,
        processingTime
      })
    }

    // Update user usage
    if (userId) {
      await updateUserApiUsage(userId)
    }

    return NextResponse.json({
      ...analysisResult,
      processingTime,
      cached: false
    })

  } catch (error) {
    console.error('Error in OpenAI image analysis API:', error)

    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image'
    const statusCode = error instanceof Error && error.message.includes('Unsupported') ? 400 : 500

    return NextResponse.json(
      { error: `Failed to analyze image with OpenAI: ${errorMessage}` },
      { status: statusCode }
    )
  }
} 