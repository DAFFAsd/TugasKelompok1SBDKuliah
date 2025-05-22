import React, { useCallback } from 'react';
import axios from 'axios';

interface ImagePasteHandlerProps {
  onImageUpload: (imageUrl: string) => void;
  onUploadStart?: () => void;
  children: React.ReactNode;
}

const ImagePasteHandler: React.FC<ImagePasteHandlerProps> = ({ onImageUpload, onUploadStart, children }) => {
  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    // Find the first image item in the clipboard
    const imageItem = Array.from(items).find(item => item.type.startsWith('image'));
    if (!imageItem) return;

    // Get the image as a blob
    const blob = imageItem.getAsFile();
    if (!blob) return;

    // Notify parent component that upload is starting
    onUploadStart?.();

    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Upload image to server
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const response = await axios.post(`${API_URL}/uploads/image`, {
          image: e.target?.result
        });

        // Call the callback with the Cloudinary URL
        onImageUpload(response.data.url);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    };
    reader.readAsDataURL(blob);
  }, [onImageUpload]);

  // Add paste event listener
  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return <>{children}</>;
};

export default ImagePasteHandler;
