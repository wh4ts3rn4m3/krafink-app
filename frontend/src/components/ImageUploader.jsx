import React, { useRef, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 4;

const ImageUploader = ({ images, setImages, disabled = false }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const validateFiles = (files) => {
    const valid = [];
    for (const file of files) {
      const type = (file.type || '').toLowerCase();
      const ext = (file.name?.split('.').pop() || '').toLowerCase();
      const byType = ACCEPTED_TYPES.includes(type);
      const byExt = ['jpg','jpeg','png','webp'].includes(ext);
      if (!byType && !byExt) {
        toast.error(`${file.name}: Only JPG/PNG/WEBP allowed`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name}: Too large (max 10MB)`);
        continue;
      }
      valid.push(file);
    }
    return valid;
  };

  const doUpload = async (files) => {
    if (!files || files.length === 0) return;
    if (images.length >= MAX_IMAGES) {
      toast.error(`You can attach up to ${MAX_IMAGES} images`);
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    const arr = Array.from(files);
    const selected = arr.slice(0, remaining);
    const overflow = Math.max(arr.length - selected.length, 0);
    if (overflow > 0) {
      toast.error(`+${overflow} not added (max ${MAX_IMAGES})`);
    }

    const valid = validateFiles(selected);
    if (valid.length === 0) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of valid) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API}/upload/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        // use filename as returned path order; keep order of valid files
        uploaded.push(res.data.url);
      }
      if (uploaded.length) {
        setImages((prev) => [...prev, ...uploaded]);
      }
    } catch (e) {
      toast.error('Failed to upload one or more images');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;
    const files = e.dataTransfer.files;
    await doUpload(files);
  };

  const onBrowse = async (e) => {
    const files = e.target.files;
    await doUpload(files);
    // reset input so same file can be selected again if removed
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 flex items-center justify-center text-sm cursor-pointer transition-colors ${dragActive ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        data-testid="image-dropzone"
        role="button"
        aria-label="Upload images"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onBrowse}
          disabled={disabled || uploading}
        />
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          <span>Drag & drop or click to upload (JPG/PNG/WEBP, max 10MB, up to {MAX_IMAGES})</span>
        </div>
      </div>

      {images?.length > 0 && (
        <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={`${BACKEND_URL}${image}`}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-80 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                data-testid={`remove-image-${index}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;