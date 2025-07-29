-- Database schema for AI Image Analysis webapp
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  api_usage_count INTEGER DEFAULT 0,
  api_usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Images table
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  original_filename VARCHAR(255),
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash for deduplication
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis results table
CREATE TABLE public.analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  model VARCHAR(100) NOT NULL,
  analysis_mode VARCHAR(50) NOT NULL,
  description TEXT,
  bounding_boxes JSONB,
  segmentation_polygons JSONB,
  confidence_scores JSONB,
  processing_time_ms INTEGER,
  token_usage JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training data table
CREATE TABLE public.training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ground_truth_boxes JSONB,
  ground_truth_labels JSONB,
  user_corrections JSONB,
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  is_approved_for_training BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_hash ON public.images(hash);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);

CREATE INDEX idx_analysis_results_user_id ON public.analysis_results(user_id);
CREATE INDEX idx_analysis_results_image_id ON public.analysis_results(image_id);
CREATE INDEX idx_analysis_results_model ON public.analysis_results(model);
CREATE INDEX idx_analysis_results_created_at ON public.analysis_results(created_at DESC);

CREATE INDEX idx_training_data_user_id ON public.training_data(user_id);
CREATE INDEX idx_training_data_image_id ON public.training_data(image_id);
CREATE INDEX idx_training_data_approved ON public.training_data(is_approved_for_training);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_data ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Images policies
CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own images" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own images" ON public.images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.images
  FOR DELETE USING (auth.uid() = user_id);

-- Analysis results policies
CREATE POLICY "Users can view own analysis results" ON public.analysis_results
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own analysis results" ON public.analysis_results
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Training data policies
CREATE POLICY "Users can view own training data" ON public.training_data
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own training data" ON public.training_data
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own training data" ON public.training_data
  FOR UPDATE USING (auth.uid() = user_id);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', false);

-- Storage policies
CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view own images" ON storage.objects
  FOR SELECT USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create a view for analytics (optional, for easier querying)
CREATE VIEW public.user_analytics AS
SELECT 
  u.id as user_id,
  u.email,
  u.subscription_tier,
  u.api_usage_count,
  COUNT(DISTINCT i.id) as total_images,
  COUNT(DISTINCT ar.id) as total_analyses,
  COALESCE(SUM(i.file_size), 0) as total_storage_bytes,
  AVG(ar.processing_time_ms) as avg_processing_time,
  COUNT(DISTINCT td.id) as training_data_count
FROM public.users u
LEFT JOIN public.images i ON u.id = i.user_id
LEFT JOIN public.analysis_results ar ON u.id = ar.user_id
LEFT JOIN public.training_data td ON u.id = td.user_id
GROUP BY u.id, u.email, u.subscription_tier, u.api_usage_count;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.images IS 'Uploaded images with metadata and deduplication';
COMMENT ON TABLE public.analysis_results IS 'AI analysis results for images';
COMMENT ON TABLE public.training_data IS 'Training data collected from user feedback';
COMMENT ON VIEW public.user_analytics IS 'Aggregated analytics per user'; 