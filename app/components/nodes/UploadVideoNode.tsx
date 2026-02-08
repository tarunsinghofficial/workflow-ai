'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Upload, Video, X, Play, AlertCircle, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface UploadVideoNodeData extends Record<string, unknown> {
  label: string;
  videoUrl?: string;
}

export function UploadVideoNode({ id, data, selected }: NodeProps) {
  const nodeData = data as UploadVideoNodeData;
  const { setNodes } = useReactFlow();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoUrl, setVideoUrl] = useState(nodeData.videoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');

  const transloaditKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;
  const templateId = process.env.NEXT_PUBLIC_TRANSLOADIT_VIDEO_TEMPLATE_ID;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !transloaditKey) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      const params = {
        auth: { key: transloaditKey },
        template_id: templateId,
        steps: templateId ? undefined : {
          encode: {
            robot: "/video/encode",
            use: ":original",
            ffmpeg_stack: "v6.0.0",
            preset: "ipad-high",
            result: true
          },
          store: {
            robot: "/s3/store",
            use: "encode",
            credentials: process.env.NEXT_PUBLIC_TRANSLOADIT_STORE_CREDENTIALS || "workflow-test-app"
          }
        }
      };

      formData.append('params', JSON.stringify(params));
      formData.append('file', file);

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
              let videoUrl = null;

              // Try to get URL from store step first (preferred)
              if (response.results?.store?.[0]) {
                videoUrl = response.results.store[0].ssl_url || response.results.store[0].url;
              }
              // Fallback to encode step
              else if (response.results?.encode?.[0]) {
                videoUrl = response.results.encode[0].ssl_url || response.results.encode[0].url;
              }
              // Last resort: uploads
              else if (response.uploads?.[0]) {
                videoUrl = response.uploads[0].ssl_url || response.uploads[0].url;
              }

              if (!videoUrl) {
                reject(new Error('No video URL in response'));
                return;
              }

              // Transform private R2 URL to public URL if needed
              const publicR2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'https://pub-bdf4587581fd4c29b91028f7f10ccbbb.r2.dev';
              if (videoUrl.includes('.r2.cloudflarestorage.com')) {
                const urlParts = videoUrl.split('.r2.cloudflarestorage.com');
                if (urlParts[1]) {
                  videoUrl = `${publicR2Domain}${urlParts[1]}`;
                  console.log('[Upload Video] Transformed to public URL:', videoUrl);
                }
              }

              resolve({ ssl_url: videoUrl });
            } catch (e) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            // Log the full error response from Transloadit
            console.error('[Upload Video] Transloadit error response:', xhr.responseText);
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              const errorMsg = errorResponse.error || errorResponse.message || `Upload failed with status ${xhr.status}`;
              reject(new Error(errorMsg));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('POST', 'https://api2.transloadit.com/assemblies');
        xhr.send(formData);
      });

      const result = await uploadPromise;
      setVideoUrl(result.ssl_url);
    } catch (err: any) {
      console.error('[Upload Video Error]:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [transloaditKey, templateId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.webm', '.m4v'] },
    multiple: false,
    disabled: !transloaditKey || isUploading
  });

  // Sync to node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, videoUrl, result: videoUrl } } : node
      )
    );
  }, [videoUrl, id, setNodes]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <BaseNode id={id} data={{ ...nodeData, label: 'Upload Video' }} selected={selected} color="amber">
      <div className="space-y-3 min-w-[240px]">
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

        {!videoUrl && !isUploading ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${transloaditKey
              ? isDragActive ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 hover:border-white/10 hover:bg-white/5'
              : 'border-white/5 opacity-50 cursor-not-allowed'
              }`}
          >
            <input {...getInputProps()} />
            <Video className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter font-sans">
              {transloaditKey ? 'Drop Video or Click' : 'Upload Disabled'}
            </p>
          </div>
        ) : isUploading ? (
          <div className="border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center bg-white/5 relative overflow-hidden">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
            <p className="text-[10px] text-amber-200 font-bold uppercase tracking-tighter mb-1">
              Uploading {uploadProgress}%
            </p>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/20">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-32 object-cover"
              onEnded={() => setIsPlaying(false)}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
              <button
                onClick={togglePlay}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-all"
              >
                {isPlaying ? <Video className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
              </button>
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-md transition-all pointer-events-none">
                  <Upload className="w-4 h-4 text-white" />
                </button>
              </div>
              <button
                onClick={() => setVideoUrl('')}
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
        className="amber"
        data-type="video"
        data-port-type="source"
      >
        <span className="handle-label handle-label-right">File*</span>
      </Handle>
    </BaseNode>
  );
}
