import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Loader2, Paperclip } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * FileContextUploader Component
 * 
 * Allows users to upload files as context for AI chat conversations.
 * The AI can then reference these files when answering questions or generating content.
 * 
 * Enhanced to support DOCX files with automatic text extraction.
 */
export default function FileContextUploader({ onFilesUpdate, existingFiles = [], maxFiles = 5 }) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [files, setFiles] = React.useState(existingFiles);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    setFiles(existingFiles);
  }, [existingFiles]);

  /**
   * Handle file upload with DOCX text extraction
   */
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check max files limit
    if (files.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file type - Now includes DOCX
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'text/plain', // TXT
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please upload PDF, Word (DOCX), Excel, image, text, or CSV.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 50MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload file
      toast.info('Uploading file...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // For DOCX files, extract text for better AI context
      let fileTextPreview = null;
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword') {
        
        try {
          toast.info('Extracting text from Word document...');
          const parseResult = await base44.functions.invoke('parseDocxFile', {
            file_url,
            extract_structured_data: false
          });

          if (parseResult.status === 'success' && parseResult.text_content) {
            fileTextPreview = parseResult.text_content.substring(0, 500) + '...';
            toast.success('Document text extracted for AI context');
          }
        } catch (extractError) {
          console.error('Text extraction failed:', extractError);
          // Continue without preview - file URL will still work
        }
      }

      const newFile = {
        file_name: file.name,
        file_url,
        file_size: file.size,
        file_type: file.type,
        text_preview: fileTextPreview,
        uploaded_date: new Date().toISOString()
      };

      const updatedFiles = [...files, newFile];
      setFiles(updatedFiles);
      onFilesUpdate(updatedFiles);

      toast.success('File added to chat context!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (fileToRemove) => {
    const updatedFiles = files.filter(f => f.file_url !== fileToRemove.file_url);
    setFiles(updatedFiles);
    onFilesUpdate(updatedFiles);
    toast.success('File removed from context');
  };

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || files.length >= maxFiles}
          variant="outline"
          size="sm"
          className="border-blue-300 hover:bg-blue-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Paperclip className="w-4 h-4 mr-2" />
              Attach Files ({files.length}/{maxFiles})
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileUpload}
          className="hidden"
        />
        <p className="text-xs text-slate-500">
          PDF, Word (DOCX), Excel, Images, etc.
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {file.file_name}
                  </p>
                  {file.text_preview && (
                    <p className="text-xs text-slate-500 truncate">
                      ✨ Text extracted for AI
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeFile(file)}
                className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      {files.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-xs text-slate-600">
            💡 Upload documents to provide context for the AI. It will reference these files when answering questions.
          </p>
        </div>
      )}
    </div>
  );
}