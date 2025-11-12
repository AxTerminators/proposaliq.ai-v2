import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, FileText, Image as ImageIcon, File } from "lucide-react";
import moment from "moment";

export default function FilePreviewModal({ isOpen, onClose, file }) {
  if (!file) return null;

  const isImage = file.file_type?.startsWith('image/');
  const isPDF = file.file_type === 'application/pdf';
  const isText = file.file_type?.startsWith('text/');

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="w-8 h-8 text-blue-600" />;
    if (isPDF) return <FileText className="w-8 h-8 text-red-600" />;
    return <File className="w-8 h-8 text-slate-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                {getFileIcon()}
              </div>
              <div>
                <DialogTitle className="text-xl mb-2">{file.file_name}</DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {file.file_category?.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    Uploaded {moment(file.created_date).format('MMM D, YYYY')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download={file.file_name}
              >
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </a>
              <a
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>
              </a>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* File Metadata */}
          {file.description && (
            <div className="bg-slate-50 border rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Description:</p>
              <p className="text-sm text-slate-600">{file.description}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Uploaded By</p>
              <p className="text-sm font-semibold text-slate-900">
                {file.uploaded_by_name || file.uploaded_by_email}
              </p>
            </div>

            <div className="bg-slate-50 border rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Upload Date</p>
              <p className="text-sm font-semibold text-slate-900">
                {moment(file.created_date).format('MMM D, YYYY [at] h:mm A')}
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="border-2 rounded-lg overflow-hidden bg-slate-50">
            {isImage ? (
              <div className="p-4">
                <img
                  src={file.file_url}
                  alt={file.file_name}
                  className="w-full h-auto max-h-[500px] object-contain mx-auto"
                />
              </div>
            ) : isPDF ? (
              <div className="w-full h-[600px]">
                <iframe
                  src={file.file_url}
                  className="w-full h-full"
                  title={file.file_name}
                />
              </div>
            ) : (
              <div className="p-12 text-center">
                <File className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600 mb-4">Preview not available for this file type</p>
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={file.file_name}
                >
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Download to View
                  </Button>
                </a>
              </div>
            )}
          </div>

          {/* File Info */}
          {file.tags?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Tags:</p>
              <div className="flex gap-2 flex-wrap">
                {file.tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}