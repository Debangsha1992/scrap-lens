import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ClickableText } from './ClickableText';
import { useBoxSelection } from '@/context/BoxSelectionContext';

interface ClickableMarkdownProps {
  children: string;
  className?: string;
}

/**
 * Component that renders markdown with clickable bounding box coordinates
 * Uses the BoxSelection context to make coordinates interactive
 */
export const ClickableMarkdown: React.FC<ClickableMarkdownProps> = ({ children, className = '' }) => {
  const { boxes, onToggleBox } = useBoxSelection();

  return (
    <div className={className}>
      <ReactMarkdown 
        components={{
          h3: ({children}) => (
            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              <ClickableText text={String(children)} boxes={boxes} onToggleBox={onToggleBox} />
            </h3>
          ),
          h4: ({children}) => (
            <h4 className="text-sm font-medium text-gray-700 mt-3 mb-1">
              <ClickableText text={String(children)} boxes={boxes} onToggleBox={onToggleBox} />
            </h4>
          ),
          ul: ({children}) => <ul className="list-disc list-inside space-y-1 ml-3 text-sm">{children}</ul>,
          li: ({children}) => (
            <li className="text-gray-600 text-sm">
              <ClickableText text={String(children)} boxes={boxes} onToggleBox={onToggleBox} />
            </li>
          ),
          code: ({children}) => (
            <ClickableText 
              text={String(children)} 
              boxes={boxes} 
              onToggleBox={onToggleBox} 
              className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono border"
            />
          ),
          strong: ({children}) => (
            <strong className="font-semibold text-gray-800">
              <ClickableText text={String(children)} boxes={boxes} onToggleBox={onToggleBox} />
            </strong>
          ),
          p: ({children}) => (
            <p className="mb-2 text-gray-700 leading-relaxed text-sm">
              <ClickableText text={String(children)} boxes={boxes} onToggleBox={onToggleBox} />
            </p>
          )
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}; 