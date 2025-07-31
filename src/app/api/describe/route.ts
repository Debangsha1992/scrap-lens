/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { BoundingBox } from '@/types/api';
import { parseBoundingBoxes, validateBoundingBox } from '@/utils/boundingBoxParser';
// Segmentation functionality removed
import { checkRateLimit, getClientIP, formatResetTime } from '@/utils/rateLimiter';

// Configuration constants
const API_CONFIG = {
  maxTokens: 1000,
  temperature: 0.7,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const;

// Initialize OpenAI client with Alibaba Cloud DashScope configuration
const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

/**
 * Validates and processes file uploads
 */
const processFileUpload = async (file: File): Promise<string> => {
  // Validate file type
  if (!API_CONFIG.supportedMimeTypes.includes(file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif')) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  // Validate file size
  if (file.size > API_CONFIG.maxFileSize) {
    throw new Error(`File size exceeds ${API_CONFIG.maxFileSize / (1024 * 1024)}MB limit`);
  }

  // Convert to base64
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/jpeg';
  
  return `data:${mimeType};base64,${base64}`;
};

/**
 * Validates URL format and accessibility
 */
const validateImageUrl = (url: string): void => {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }
  } catch {
    throw new Error('Invalid URL format');
  }
};

/**
 * Generates appropriate prompt based on analysis type
 */
const generatePrompt = (enableBoundingBoxes: boolean): string => {
  if (enableBoundingBoxes) {
    return 'Please analyze this image and provide detailed descriptions of all objects you can see. For each object, please specify its location using coordinates in the format [x, y, width, height] where x,y is the top-left corner. List each object with its bounding box coordinates.';
  } else {
    return 'Describe what\'s in this image in detail.';
  }
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
 * Processes bounding boxes and validates results
 */
const processBoundingBoxes = (
  description: string, 
  enableBoundingBoxes: boolean
): BoundingBox[] => {
  if (!enableBoundingBoxes || !description) {
    return [];
  }

  const boxes = parseBoundingBoxes(description);
      const validBoxes = boxes.filter(box => {
      const isUnwanted = isUnwantedLabel(box.label)
      const isValid = validateBoundingBox(box) && !isUnwanted
      
      if (isUnwanted) {
        console.log(`Filtered out unwanted label: "${box.label}"`)
      }
      
      if (!isValid) {
        console.warn('Invalid bounding box detected:', box)
      }
      return isValid
    });

  if (boxes.length > validBoxes.length) {
    console.warn(`Filtered out ${boxes.length - validBoxes.length} invalid bounding boxes`);
  }

  console.log(`Processed ${validBoxes.length} valid bounding boxes from response`);
  return validBoxes;
};

// Segmentation functionality removed

/**
 * Cleans up AI response to create a readable scene description with markdown formatting
 */
const cleanSceneDescription = (description: string): string => {
  if (!description || typeof description !== 'string') {
    return 'Scene analysis completed successfully. Please check the detected objects section for detailed information about identified items in the image.'
  }

  // Step 1: Aggressively remove ALL problematic content patterns
  const cleanedText = description
    // Remove ALL [object Object] patterns (multiple variations)
    .replace(/,\s*\[object Object\],?\s*/g, '')
    .replace(/\[object Object\],?\s*/g, '')
    .replace(/,\s*\[object Object\]/g, '')
    .replace(/\[object Object\]/g, '')
    // Remove ALL coordinate patterns
    .replace(/\*\*[^*]+\*\*[^`]*`?\[[\d,\s]+\]`?(?:\s*\([\d%]+\))?/g, '')
    .replace(/\[[\d,\s]+\]/g, '')
    .replace(/\(\d+%\)/g, '')
    // Remove polygon coordinates
    .replace(/\[\([^)]+\)(,\([^)]+\))*\]/g, '')
    // Remove structured section headers that cause issues
    .replace(/###\s*Object Details[\s\S]*?(?=\n\n|$)/g, '')
    .replace(/\*\*Bounding Box Coordinates\*\*:?[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/\*\*Object Details\*\*:?[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/\*\*Segmentation\*\*:?[\s\S]*?(?=\n\n|$)/gi, '')
    // Remove Qwen-specific formatting
    .replace(/###\s*\d+\.\s*/g, '')
    .replace(/###\s*Summary[^:]*:/g, '')
    .replace(/This analysis covers all[^.]*\./g, '')
    .replace(/Here is a detailed analysis[^:]*:/g, '')
    // Remove numbered object listings
    .replace(/\d+\.\s*\*\*[^*]+\*\*:?[^.]*\./g, '')
    .replace(/\d+\.\s*[^.]*\./g, '')
    // Remove markdown formatting artifacts
    .replace(/\*\*([^*]+)\*\*:\s*-\s*/g, '$1: ')
    .replace(/\*\*([^*]+)\*\*:\s*/g, '$1: ')
    .replace(/Position\*\*:|Color and Texture\*\*:/g, '')
    .replace(/###\s*/g, '')
    // Remove trailing formatting artifacts
    .replace(/\s*-\s*,\s*/g, ' ')
    .replace(/,\s*-\s*/g, ' ')
    .replace(/:\s*-\s*/g, ': ')
    .replace(/\s*:\s*,\s*/g, ', ')

  // Step 2: Extract ONLY the main scene description (first meaningful paragraph)
  const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim())
  let sceneDescription = ''
  
  for (const sentence of sentences) {
    const cleanSentence = sentence
      .replace(/\s+/g, ' ')
      .replace(/^[^A-Za-z]*/, '') // Remove leading non-letters
      .trim()
    
    // Look for the first sentence that describes the actual scene
    if (cleanSentence.length > 30 && 
        !cleanSentence.includes('[') && 
        !cleanSentence.includes(']') && 
        !cleanSentence.includes('Position') &&
        !cleanSentence.includes('Color and Texture') &&
        !cleanSentence.includes('Object Details') &&
        !cleanSentence.includes('Bounding Box') &&
        !cleanSentence.includes('coordinates') &&
        !cleanSentence.match(/^\d+\s/) &&
        cleanSentence.match(/[A-Za-z]{3,}/)) {
      
      sceneDescription = cleanSentence
      break
    }
  }

  // Step 3: If no good description found, look for key descriptive phrases
  if (!sceneDescription) {
    // Look for scene description patterns
    const scenePatterns = [
      /This image shows ([^.]+)\./i,
      /The scene depicts ([^.]+)\./i,
      /The image contains ([^.]+)\./i,
      /In this image, ([^.]+)\./i,
      /The photograph shows ([^.]+)\./i
    ]
    
    for (const pattern of scenePatterns) {
      const match = cleanedText.match(pattern)
      if (match && match[1]) {
        sceneDescription = match[1].trim()
        break
      }
    }
  }

  // Step 4: Final cleanup and formatting
  if (sceneDescription) {
    sceneDescription = sceneDescription
      .replace(/\s+/g, ' ')
      .replace(/\.\s*\./g, '.')
      .replace(/\s*\.\s*/g, '. ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*:\s*/g, ': ')
      .replace(/^[^A-Za-z]*/, '') // Remove leading non-letter characters
      .trim()
    
    // Ensure it starts with a capital letter
    if (sceneDescription.length > 0) {
      sceneDescription = sceneDescription.charAt(0).toUpperCase() + sceneDescription.slice(1)
    }
    
    // Ensure it ends with a period
    if (!sceneDescription.endsWith('.') && !sceneDescription.endsWith('!') && !sceneDescription.endsWith('?')) {
      sceneDescription += '.'
    }
    
    return sceneDescription
  }

  // Step 5: Fallback description
  return 'This image shows a complex scene with multiple objects and elements. The analysis has identified several key components and their relationships within the composition.'
};



/**
 * Main POST handler for image analysis
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get client IP and check rate limit
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(clientIP);

    // Return rate limit error if exceeded
    if (!rateLimitResult.success) {
      const resetTimeFormatted = formatResetTime(rateLimitResult.resetTime);
      
      return NextResponse.json(
        { 
          error: rateLimitResult.message || 'Rate limit exceeded',
          details: {
            resetIn: resetTimeFormatted,
            resetTime: new Date(rateLimitResult.resetTime).toISOString(),
            remaining: rateLimitResult.remaining
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());

    // Extract and validate inputs
    const file = formData.get('file') as File | null;
    const urlInput = body.imageUrl as string;
    const base64Input = body.imageBase64 as string;
    const enableBoundingBoxes = body.enableBoundingBoxes === 'true';
    // Segmentation functionality removed
    const model = (body.model as string) || 'qwen-vl-max';
    const imageWidth = parseInt(body.imageWidth as string) || 800;
    const imageHeight = parseInt(body.imageHeight as string) || 600;

    // Determine image source and validate
    let imageUrl = '';
    if (file) {
      imageUrl = await processFileUpload(file);
    } else if (base64Input) {
      imageUrl = base64Input;
    } else if (urlInput) {
      const trimmedUrl = urlInput.trim();
      validateImageUrl(trimmedUrl);
      imageUrl = trimmedUrl;
    } else {
      return NextResponse.json(
        { error: 'Either file, imageUrl, or imageBase64 must be provided' },
        { status: 400 }
      );
    }

    // Prepare API request
    const prompt = generatePrompt(enableBoundingBoxes);
    const messageContent = [
      {
        type: 'image_url' as const,
        image_url: { url: imageUrl },
      },
      {
        type: 'text' as const,
        text: prompt,
      },
    ];

    const apiOptions = {
      model: model,
      messages: [
        {
          role: 'user' as const,
          content: messageContent,
        },
      ],
      max_tokens: API_CONFIG.maxTokens,
      temperature: API_CONFIG.temperature,
    };

    // Make API call
    const completion = await client.chat.completions.create(apiOptions);
    const description = completion.choices[0]?.message?.content || 'No description available';

    // Process results
    const boxes = processBoundingBoxes(description, enableBoundingBoxes);
    // Segmentation functionality removed

    // Clean up description by removing coordinate data and creating a readable scene description  
    const cleanDescription = cleanSceneDescription(description);

    return NextResponse.json({
      description: cleanDescription,
      boxes,
      usage: completion.usage,
      model: model,
      boundingBoxesEnabled: enableBoundingBoxes,
    }, {
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      }
    });
  } catch (error) {
    console.error('Error in image analysis API:', error);

    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
    const statusCode = error instanceof Error && error.message.includes('Unsupported') ? 400 : 500;

    return NextResponse.json(
      { error: `Failed to analyze image: ${errorMessage}` },
      { status: statusCode }
    );
  }
} 