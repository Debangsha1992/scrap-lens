import React from 'react';
import { motion } from 'framer-motion';
import { InputMethod } from '@/types/api';

interface ImageInputCardProps {
  inputMethod: InputMethod;
  setInputMethod: (method: InputMethod) => void;
  imageUrl: string;
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (url: string) => void;
  onExampleImage: () => void;
}

/**
 * Card component for image input method selection and file/URL handling
 */
export const ImageInputCard: React.FC<ImageInputCardProps> = ({
  inputMethod,
  setInputMethod,
  imageUrl,
  selectedFile,
  fileInputRef,
  onFileSelect,
  onImageUrlChange,
  onExampleImage,
}) => (
  <motion.div 
    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Image Input</h2>
    
    <div className="flex gap-2 mb-6">
      <motion.button
        onClick={() => setInputMethod('file')}
        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
          inputMethod === 'file' 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        Upload File
      </motion.button>
      <motion.button
        onClick={() => setInputMethod('url')}
        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
          inputMethod === 'url' 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        Image URL
      </motion.button>
    </div>

    {inputMethod === 'file' && (
      <FileUploadSection
        selectedFile={selectedFile}
        fileInputRef={fileInputRef}
        onFileSelect={onFileSelect}
      />
    )}

    {inputMethod === 'url' && (
      <UrlInputSection
        imageUrl={imageUrl}
        onImageUrlChange={onImageUrlChange}
        onExampleImage={onExampleImage}
      />
    )}
  </motion.div>
);

/**
 * File upload section component
 */
interface FileUploadSectionProps {
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  selectedFile,
  fileInputRef,
  onFileSelect,
}) => (
  <div className="space-y-4">
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-sm font-medium text-gray-600">
          {selectedFile ? selectedFile.name : 'Click to upload or drag & drop'}
        </span>
        <span className="text-xs text-gray-400">PNG, JPG, WebP up to 10MB</span>
      </label>
    </div>
  </div>
);

/**
 * URL input section component
 */
interface UrlInputSectionProps {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onExampleImage: () => void;
}

const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  imageUrl,
  onImageUrlChange,
  onExampleImage,
}) => (
  <div className="space-y-4">
    <input
      type="url"
      value={imageUrl}
      onChange={(e) => onImageUrlChange(e.target.value)}
      placeholder="https://example.com/image.jpg"
      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    <button
      type="button"
      onClick={onExampleImage}
      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
    >
      📷 Use example image
    </button>
  </div>
); 