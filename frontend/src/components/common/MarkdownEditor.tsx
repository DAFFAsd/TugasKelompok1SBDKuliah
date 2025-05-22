import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import ImagePasteHandler from './ImagePasteHandler';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your content using Markdown...',
  className = '',
  rows = 6
}) => {
  const [previewMode, setPreviewMode] = useState(false);

  const handleImageUpload = (imageUrl: string) => {
    // Insert the image markdown at the current cursor position or at the end
    const textArea = document.querySelector('textarea') as HTMLTextAreaElement;
    const cursorPosition = textArea?.selectionStart || value.length;
    const imageMarkdown = `![image](${imageUrl})`;
    
    const newValue = value.slice(0, cursorPosition) + 
                    imageMarkdown + 
                    value.slice(cursorPosition);
    
    onChange(newValue);
  };

  return (
    <div className="markdown-editor">
      <div className="flex justify-end space-x-2 mb-2">
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className="px-3 py-1 text-sm rounded bg-primary-100 dark:bg-dark-accent text-primary-700 dark:text-dark-text hover:bg-primary-200 dark:hover:bg-dark-accent-hover"
        >
          {previewMode ? 'Edit' : 'Preview'}
        </button>
      </div>
      
      <ImagePasteHandler onImageUpload={handleImageUpload}>
        {previewMode ? (
          <div className="prose dark:prose-invert max-w-none p-3 min-h-[10rem] border rounded-md bg-white dark:bg-gray-800">
            <ReactMarkdown 
              remarkPlugins={[remarkMath, remarkGfm]}
            >
              {value}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-dark-text ${className}`}
          />
        )}
      </ImagePasteHandler>
      
      <div className="mt-2 text-sm text-secondary-600 dark:text-dark-muted">
        Tip: You can paste images directly into the editor
      </div>
    </div>
  );
};

export default MarkdownEditor;
