'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Upload, Image as ImageIcon, X, AlertCircle, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface UploadImageNodeData extends Record<string, unknown> {
  label: string;
  imageUrl?: string;
  imagePreview?: string;
}

export function UploadImageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as UploadImageNodeData;
  const { setNodes } = useReactFlow();

  const [imageUrl, setImageUrl] = useState(nodeData.imageUrl || '');
  const [imagePreview, setImagePreview] = useState(nodeData.imagePreview || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const transloaditKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;
  const templateId = process.env.NEXT_PUBLIC_TRANSLOADIT_IMAGE_TEMPLATE_ID;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !transloaditKey) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    // Create a local preview
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      const formData = new FormData();
      const params = {
        auth: { key: transloaditKey },
        template_id: templateId,
        steps: templateId ? undefined : {
          resize: {
            robot: "/image/resize",
            use: ":original",
            result: true
          }
        }
      };

      formData.append('params', JSON.stringify(params));
      formData.append('file', file);

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<{ ssl_url: string }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              // Transloadit assembly result
              if (response.results?.resize?.[0]) {
                resolve(response.results.resize[0]);
              } else if (response.uploads?.[0]) {
                resolve(response.uploads[0]);
              } else {
                reject(new Error('No results in response'));
              }
            } catch (e) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('POST', 'https://api2.transloadit.com/assemblies');
        xhr.send(formData);
      });

      const result = await uploadPromise;
      const finalUrl = result.ssl_url;
      setImageUrl(finalUrl);
      setImagePreview(finalUrl);
    } catch (err: any) {
      console.error('[Upload Error]:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [transloaditKey, templateId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false,
    disabled: !transloaditKey || isUploading
  });

  // Sync to node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, imageUrl, imagePreview, result: imageUrl } } : node
      )
    );
  }, [imageUrl, imagePreview, id, setNodes]);

  return (
    <BaseNode id={id} data={{ ...nodeData, label: 'File' }} selected={selected} color="emerald">
      <div className="space-y-3 min-w-[220px]">
        {!transloaditKey && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-start gap-2 mb-2">
            <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[9px] text-amber-200 leading-tight font-sans">
              TRANSLOADIT_KEY missing in .env.local
            </p>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-md p-2 flex items-start gap-2 mb-2">
            <AlertCircle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-[9px] text-rose-200 leading-tight font-sans">
              {error}
            </p>
          </div>
        )}

        {!imagePreview && !isUploading ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${transloaditKey
                ? isDragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                : 'border-white/5 opacity-50 cursor-not-allowed'
              }`}
          >
            <input {...getInputProps()} />
            <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter font-sans">
              {transloaditKey ? 'Drop Image or Click' : 'Upload Disabled'}
            </p>
          </div>
        ) : isUploading ? (
          <div className="border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center bg-white/5 relative overflow-hidden">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
            <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-tighter mb-1">
              Uploading {uploadProgress}%
            </p>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/20 checkerboard">
            <img src={imagePreview} alt="Preview" className="w-full h-[180px] object-contain relative z-10" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-all pointer-events-none">
                  <Upload className="w-4 h-4 text-white" />
                </button>
              </div>
              <button
                onClick={() => { setImageUrl(''); setImagePreview(''); }}
                className="p-2 bg-rose-500/20 hover:bg-rose-500/40 rounded-lg backdrop-blur-md transition-all"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="emerald"
        data-type="image"
        data-port-type="source"
      >
        <span className="handle-label handle-label-right">File*</span>
      </Handle>
    </BaseNode>
  );
}
