'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { InputMethod } from '@/types/api';
import { useImageAnalysis } from '@/hooks/useImageAnalysis';
import { ImageCanvas } from '@/components/ImageCanvas';
import { ImageInputCard } from '@/components/ImageInputCard';
import { BoxSelectionProvider } from '@/context/BoxSelectionContext';
import { AuthComponent } from '@/components/AuthComponent';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { ClickableMarkdown } from '@/components/ClickableMarkdown';
import { supabase } from '@/lib/supabase';
import { UserProfile, subscriptionLimits } from '@/types/auth';
import Image from 'next/image';

const EXAMPLE_IMAGE_URL = 'https://dashscope.oss-cn-beijing.aliyuncs.com/images/dog_and_girl.jpeg';

/**
 * Main application component for AI image analysis
 * Provides file upload, URL input, and object detection capabilities
 */
export default function Home(): React.JSX.Element {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(false);

  // State management
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<InputMethod>('file');
  const [selectedBoxIndices, setSelectedBoxIndices] = useState<Set<number>>(new Set());

  // Hooks
  const { description, boxes, usage, loading, error, analyzeImage, clearResults } = useImageAnalysis();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set development mode after component mounts to avoid hydration mismatch
  useEffect(() => {
    const devMode = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname.includes('vercel.app') ||
       window.location.hostname.includes('scrap-lens-dev') ||
       window.location.hostname.includes('scrap-lens') ||
       process.env.NODE_ENV === 'development' ||
       process.env.VERCEL_ENV === 'preview' ||
       process.env.VERCEL_ENV === 'development');
    
    setIsDevelopment(devMode);
  }, []);

  // Authentication effect - skip in development
  useEffect(() => {
    if (isDevelopment) {
      console.log('Development mode detected - skipping authentication');
      setAuthLoading(false);
      return;
    }

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          
          // Fetch user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUserProfile(profile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [isDevelopment]);

  // Derived state
  const hasInput = Boolean(selectedFile || imageUrl.trim());

  // Event handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImageUrl('');
    setInputMethod('file');
    setCurrentImage(URL.createObjectURL(file));
  };

  const handleImageUrlChange = (url: string): void => {
    setImageUrl(url);
    setSelectedFile(null);
    setInputMethod('url');
    setCurrentImage(url);
  };

  const handleQwenAnalyze = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await analyzeImage(selectedFile, imageUrl, 'detection', 'qwen');
  };

  const handleOpenaiAnalyze = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    await analyzeImage(selectedFile, imageUrl, 'detection', 'openai');
  };

  const handleExampleImage = (): void => {
    setImageUrl(EXAMPLE_IMAGE_URL);
    setCurrentImage(EXAMPLE_IMAGE_URL);
    setSelectedFile(null);
    setInputMethod('url');
  };

  const clearImage = (): void => {
    setSelectedFile(null);
    setImageUrl('');
    setCurrentImage('');
    setSelectedBoxIndices(new Set());
    clearResults();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleBoxSelection = (index: number): void => {
    setSelectedBoxIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const clearBoxSelection = (): void => {
    setSelectedBoxIndices(new Set());
  };

  const handleSignOut = async () => {
    if (isDevelopment) {
      // In development, just reload the page
      window.location.reload();
      return;
    }
    
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // const handleAuthSuccess = (): void => {
  //   // Auth success is handled by the useEffect listener
  // };

  // Show loading spinner while checking authentication (skip in development)
  if (authLoading && !isDevelopment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated (skip in development)
  if (!user && !isDevelopment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to ScrapLens AI</h1>
            <p className="text-gray-600">Please sign in to continue</p>
          </div>
          <AuthComponent />
        </div>
      </div>
    );
  }

  // Show loading while determining development mode
  if (!isDevelopment && authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  if (showAnalytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
            <button
              onClick={() => setShowAnalytics(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Analysis
            </button>
          </div>
          <AnalyticsDashboard />
        </div>
      </div>
    );
  }
  return (
    <BoxSelectionProvider
      boxes={boxes}
      selectedBoxIndices={selectedBoxIndices}
      onToggleBox={toggleBoxSelection}
    >
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-2 py-4 max-w-[95vw]">
          <UserNav 
            user={user} 
            userProfile={userProfile} 
            onSignOut={handleSignOut}
            showAnalytics={showAnalytics}
            setShowAnalytics={setShowAnalytics}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Input and Options */}
            <div className="lg:col-span-1 space-y-6">
              {/* Image Input */}
              <ImageInputCard
                selectedFile={selectedFile}
                imageUrl={imageUrl}
                inputMethod={inputMethod}
                setInputMethod={setInputMethod}
                onFileSelect={handleFileSelect}
                onImageUrlChange={handleImageUrlChange}
                onExampleImage={handleExampleImage}
                fileInputRef={fileInputRef}
              />
            
              {/* API Provider Buttons */}
              <ApiProviderButtons
                loading={loading}
                hasInput={hasInput}
                onQwenAnalyze={handleQwenAnalyze}
                onOpenaiAnalyze={handleOpenaiAnalyze}
                onClearImage={clearImage}
              />

              {/* Rate Limit Info */}
              {userProfile && (
                <UserLimitCard userProfile={userProfile} />
              )}
            </div>

            {/* Right Column - Image Display and Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Display */}
              {currentImage && (
                <ImageDisplayCard
                  currentImage={currentImage}
                  boxes={boxes}
                  selectedBoxIndices={selectedBoxIndices}
                  onToggleBox={toggleBoxSelection}
                  onClearSelection={clearBoxSelection}
                />
              )}
            
              {/* Analysis Results */}
              <AnalysisSection
                loading={loading}
                error={error}
                description={description}
                usage={usage}
                boxes={boxes}
                selectedBoxIndices={selectedBoxIndices}
              />
            </div>
          </div>
        </div>
      </div>
    </BoxSelectionProvider>
  );
}

const Header: React.FC = () => (
  <header className="bg-white shadow-sm border-b border-gray-200">
    <div className="container mx-auto px-4 py-0.375">
      <div className="flex items-center space-x-4">
        <Image
          src="/scraplens_logo_trans.png"
          alt="scraplens.ai logo"
          width={180}
          height={180}
          className="rounded-lg"
          priority
        />
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 leading-tight">
          ScrapLens AI: <span className="block md:inline">Scrap Analysis using AI</span>
        </h1>
      </div>
    </div>
  </header>
);

interface AnalysisSectionProps {
  loading: boolean;
  error: string;
  description: string;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  selectedBoxIndices: Set<number>;
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  loading,
  error,
  description,
  usage,
  boxes,
  selectedBoxIndices,
}) => (
  <div className="space-y-6">
    {loading && <LoadingCard />}
    {error && <ErrorCard error={error} />}
    {description && <AnalysisResultsCard description={description} usage={usage} boxes={boxes} selectedBoxIndices={selectedBoxIndices} />}
  </div>
);

const ApiProviderButtons: React.FC<{
  loading: boolean;
  hasInput: boolean;
  onQwenAnalyze: (e: React.FormEvent) => void;
  onOpenaiAnalyze: (e: React.FormEvent) => void;
  onClearImage: () => void;
}> = ({ loading, hasInput, onQwenAnalyze, onOpenaiAnalyze, onClearImage }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
  >
    <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Analysis Provider</h3>
    
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onQwenAnalyze}
          disabled={loading || !hasInput}
          className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Granular/In-depth Analysis
            </>
          )}
        </button>
        
        <button
          onClick={onOpenaiAnalyze}
          disabled={loading || !hasInput}
          className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generic Taxonomy
            </>
          )}
        </button>
      </div>
      
      <button
        onClick={onClearImage}
        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        Clear Image
      </button>
    </div>
  </motion.div>
);

const ImageDisplayCard: React.FC<{
  currentImage: string;
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  selectedBoxIndices: Set<number>;
  onToggleBox: (index: number) => void;
  onClearSelection: () => void;
}> = ({ currentImage, boxes, selectedBoxIndices, onClearSelection }) => {
  const hasResults = boxes.length > 0;
  
  const getDisplayTitle = () => {
    return 'Object Detection';
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{getDisplayTitle()}</h3>
        {hasResults && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {selectedBoxIndices.size > 0 ? `${selectedBoxIndices.size} selected` : 'Click objects to select'}
            </span>
        {selectedBoxIndices.size > 0 && (
          <button
            onClick={onClearSelection}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
          >
                Clear Selection
          </button>
            )}
            <span className="text-sm text-gray-500">
              Show All Boxes
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <ImageCanvas 
          imageUrl={currentImage} 
          boxes={boxes}
          selectedBoxIndices={selectedBoxIndices}
        />
      </div>
    </motion.div>
  );
};

const LoadingCard: React.FC = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
  >
    <div className="flex items-center space-x-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="text-gray-600">Analyzing image...</span>
    </div>
  </motion.div>
);

const ErrorCard: React.FC<{ error: string }> = ({ error }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="bg-red-50 border border-red-200 rounded-2xl p-6"
  >
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>
      </div>
    </div>
  </motion.div>
);

const AnalysisResultsCard: React.FC<{
  description: string;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  selectedBoxIndices: Set<number>;
}> = ({ description, usage, boxes, selectedBoxIndices }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis Results</h3>
      
      <div className="space-y-6">
        {/* Interactive Scene Description */}
        <InteractiveSceneDescription 
          description={description}
          boxes={boxes}
          selectedBoxIndices={selectedBoxIndices}
        />

        {/* Object Detection Summary */}
        {boxes.length > 0 && (
          <div className="mt-6 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h4 className="font-semibold text-gray-800">
                Detected Objects ({boxes.length})
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boxes.map((box, index) => (
                <DetectedObjectCard 
                  key={`${box.label}-${index}`} 
                  box={box} 
                  index={index} 
                  isSelected={selectedBoxIndices.has(index)}
                  onToggleSelection={() => {
                    const newSet = new Set(selectedBoxIndices);
                    if (newSet.has(index)) {
                      newSet.delete(index);
                    } else {
                      newSet.add(index);
                    }
                    // This would need to be passed from parent
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Usage Statistics */}
        {usage && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Token Usage</h4>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {usage.prompt_tokens && (
                <span>Prompt: {usage.prompt_tokens.toLocaleString()}</span>
              )}
              {usage.completion_tokens && (
                <span>Response: {usage.completion_tokens.toLocaleString()}</span>
              )}
              {usage.total_tokens && (
                <span>Total: {usage.total_tokens.toLocaleString()}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const InteractiveSceneDescription: React.FC<{
  description: string;
  boxes: Array<{ label: string; x: number; y: number; width: number; height: number; confidence?: number }>;
  selectedBoxIndices: Set<number>;
}> = ({ description, boxes, selectedBoxIndices }) => {
  // const [isExpanded, setIsExpanded] = useState(false);

  // Parse scrap items from the OpenAI structured response
  const parseScrapItems = (desc: string) => {
    const items: Array<{type: string, category: string}> = [];
    
    // Try to parse the new OpenAI format: "**type**: category"
    const matches = desc.match(/\*\*([^*]+)\*\*:\s*([^\n]+)/g);
    if (matches) {
      matches.forEach(match => {
        const [, type, category] = match.match(/\*\*([^*]+)\*\*:\s*([^\n]+)/) || [];
        if (type && category) {
          items.push({ type: type.trim(), category: category.trim() });
        }
      });
    }
    
    return items;
  };

  const scrapItems = parseScrapItems(description);

  // Create taxonomy tree structure
  const createTaxonomyTree = (items: Array<{type: string, category: string}>) => {
    const tree: {
      ferrous: {
        HMS: Array<{type: string, category: string}>,
        'P&S': Array<{type: string, category: string}>,
        Pipe: Array<{type: string, category: string}>
      },
      nonFerrous: {
        Copper: Array<{type: string, category: string}>,
        Motors: Array<{type: string, category: string}>,
        Transformers: Array<{type: string, category: string}>
      }
    } = {
      ferrous: { HMS: [], 'P&S': [], Pipe: [] },
      nonFerrous: { Copper: [], Motors: [], Transformers: [] }
    };

    items.forEach(item => {
      const category = item.category.toLowerCase();
      
      // Ferrous classifications
      if (category.includes('rebar') || category.includes('hms')) {
        tree.ferrous.HMS.push(item);
      } else if (category.includes('p&s')) {
        tree.ferrous['P&S'].push(item);
      } else if (category.includes('pipe')) {
        tree.ferrous.Pipe.push(item);
      }
      // Non-ferrous classifications
      else if (category.includes('copper')) {
        tree.nonFerrous.Copper.push(item);
      } else if (category.includes('motor')) {
        tree.nonFerrous.Motors.push(item);
      } else if (category.includes('transformer')) {
        tree.nonFerrous.Transformers.push(item);
      }
      // Default to HMS if uncertain
      else {
        tree.ferrous.HMS.push(item);
      }
    });

    return tree;
  };

  const taxonomyTree = createTaxonomyTree(scrapItems);

  // Count total items
  const totalFerrous = Object.values(taxonomyTree.ferrous).flat().length;
  const totalNonFerrous = Object.values(taxonomyTree.nonFerrous).flat().length;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h4 className="font-semibold text-gray-800 text-lg">Scrap Metal Analysis</h4>
      </div>

      <div className="space-y-6">
        {scrapItems.length > 0 ? (
          <div className="space-y-4">
            {/* Ferrous Metals Tree */}
            {totalFerrous > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <h5 className="font-bold text-gray-800 text-lg">Ferrous ({totalFerrous})</h5>
                </div>
                
                <div className="space-y-3 ml-6">
                  {/* HMS Section */}
                  {taxonomyTree.ferrous.HMS.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <h6 className="font-semibold text-gray-700">HMS</h6>
                      </div>
                      <div className="ml-6 space-y-1">
                        {taxonomyTree.ferrous.HMS.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 text-sm"><ClickableMarkdown>{item.category}</ClickableMarkdown></div>
                              <div className="text-xs text-gray-600"><ClickableMarkdown>{item.type}</ClickableMarkdown></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* P&S Section */}
                  {taxonomyTree.ferrous['P&S'].length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <h6 className="font-semibold text-gray-700">P&S</h6>
                      </div>
                      <div className="ml-6 space-y-1">
                        {taxonomyTree.ferrous['P&S'].map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 text-sm"><ClickableMarkdown>{item.category}</ClickableMarkdown></div>
                              <div className="text-xs text-gray-600"><ClickableMarkdown>{item.type}</ClickableMarkdown></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pipe Section */}
                  {taxonomyTree.ferrous.Pipe.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <h6 className="font-semibold text-gray-700">Pipe</h6>
                      </div>
                      <div className="ml-6 space-y-1">
                        {taxonomyTree.ferrous.Pipe.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 text-sm"><ClickableMarkdown>{item.category}</ClickableMarkdown></div>
                              <div className="text-xs text-gray-600"><ClickableMarkdown>{item.type}</ClickableMarkdown></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Non-Ferrous Metals Tree */}
            {totalNonFerrous > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <h5 className="font-bold text-gray-800 text-lg">Non-Ferrous ({totalNonFerrous})</h5>
                </div>
                
                <div className="space-y-3 ml-6">
                  {/* Copper Section */}
                  {taxonomyTree.nonFerrous.Copper.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <h6 className="font-semibold text-gray-700">Copper</h6>
                      </div>
                      <div className="ml-6 space-y-1">
                        {taxonomyTree.nonFerrous.Copper.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                            <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 text-sm"><ClickableMarkdown>{item.category}</ClickableMarkdown></div>
                              <div className="text-xs text-gray-600"><ClickableMarkdown>{item.type}</ClickableMarkdown></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Motors Section */}
                  {taxonomyTree.nonFerrous.Motors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <h6 className="font-semibold text-gray-700">Motors</h6>
                      </div>
                      <div className="ml-6 space-y-1">
                        {taxonomyTree.nonFerrous.Motors.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                            <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 text-sm"><ClickableMarkdown>{item.category}</ClickableMarkdown></div>
                              <div className="text-xs text-gray-600"><ClickableMarkdown>{item.type}</ClickableMarkdown></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transformers Section */}
                  {taxonomyTree.nonFerrous.Transformers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <h6 className="font-semibold text-gray-700">Transformers</h6>
                      </div>
                      <div className="ml-6 space-y-1">
                        {taxonomyTree.nonFerrous.Transformers.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                            <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 text-sm"><ClickableMarkdown>{item.category}</ClickableMarkdown></div>
                              <div className="text-xs text-gray-600"><ClickableMarkdown>{item.type}</ClickableMarkdown></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Fallback to original text display for non-structured responses */
          <div className="text-gray-700 leading-relaxed">
            <ClickableMarkdown>{description}</ClickableMarkdown>
          </div>
        )}

        {/* Interactive Object Tags */}
        {boxes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-blue-200">
            {boxes.map((box, index) => {
              // Extract type and category from label format: "Type (Category)"
              const labelMatch = box.label.match(/^(.+?)\s*\((.+?)\)$/);
              const type = labelMatch ? labelMatch[1] : box.label;
              const category = labelMatch ? labelMatch[2] : '';
              
              return (
                <span
                  key={`${box.label}-${index}`}
                  className={`px-3 py-2 rounded-full text-sm font-medium cursor-pointer transition-all ${
                    selectedBoxIndices.has(index)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-200'
                  }`}
                  title={category ? `Category: ${category}` : ''}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{type}</span>
                    {category && (
                      <span className="text-xs opacity-75 mt-0.5">{category}</span>
                    )}
                  </div>
                  {box.confidence && (
                    <span className="ml-1 opacity-75">
                      {(box.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const DetectedObjectCard: React.FC<{
  box: { label: string; x: number; y: number; width: number; height: number; confidence?: number };
  index: number;
  isSelected: boolean;
  onToggleSelection: () => void;
}> = ({ box, index, isSelected, onToggleSelection }) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  const color = colors[index % colors.length];

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
          : 'bg-white border-gray-100 hover:bg-gray-50'
      }`}
      onClick={onToggleSelection}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggleSelection()}
    >
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 truncate" title={box.label}>
          {box.label.replace(/^plaintext\s*/i, "")}
        </div>
        <div className="text-xs text-gray-500">
          Position: ({box.x}, {box.y}) • Size: {box.width}×{box.height}
          {box.confidence && (
            <span className="ml-2 text-blue-600 font-medium">
              {(box.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      {isSelected && (
        <div className="text-blue-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

const UserNav: React.FC<{
  user: User | null;
  userProfile: UserProfile | null;
  onSignOut: () => void;
  showAnalytics: boolean;
  setShowAnalytics: (show: boolean) => void;
}> = ({ user, userProfile, onSignOut, showAnalytics, setShowAnalytics }) => (
  <div className="flex items-center justify-between mb-8 p-4 bg-white rounded-xl border border-gray-200">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold text-sm">
          {user ? user.email?.charAt(0).toUpperCase() : 'D'}
        </span>
      </div>
      <div>
        <p className="font-medium text-gray-800">
          {user ? user.email : 'Development Mode'}
        </p>
        <p className="text-sm text-gray-500">
          {userProfile ? `${userProfile.api_usage_count}/${subscriptionLimits[userProfile.subscription_tier].daily_requests} requests used` : 'Unlimited requests'}
        </p>
      </div>
    </div>
    
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setShowAnalytics(!showAnalytics)}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
      </button>
      <button
        onClick={onSignOut}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  </div>
);

const UserLimitCard: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const limits = subscriptionLimits[userProfile.subscription_tier];
  const dailyUsage = userProfile.api_usage_count || 0;
  const monthlyUsage = userProfile.api_usage_count || 0; // Using same field since monthly isn't tracked separately
  const usagePercentage = (dailyUsage / limits.daily_requests) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Usage Limits</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Daily Requests</span>
            <span className="text-sm font-medium text-gray-800">
              {dailyUsage}/{limits.daily_requests}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p>Plan: {userProfile.subscription_tier}</p>
          <p>Total Usage: {monthlyUsage}</p>
          <p>Resets: Daily at midnight</p>
        </div>
      </div>
    </motion.div>
  );
}; 