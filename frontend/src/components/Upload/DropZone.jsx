import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadDocument } from '../../services/api';
import { useAppStore } from '../../store/appStore';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

export default function DropZone() {
  const { uploadProgress, uploadStatus, setUploadProgress, setUploadStatus, addUploadedDoc } =
    useAppStore();

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];

    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const result = await uploadDocument(file, (pct) => setUploadProgress(pct));
      addUploadedDoc({ ...result, filename: file.name, size: file.size });
      setUploadStatus('success');
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    disabled: uploadStatus === 'uploading',
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
        style={{ opacity: uploadStatus === 'uploading' ? 0.7 : 1 }}
      >
        <input {...getInputProps()} />

        <div style={{ marginBottom: 16 }}>
          {uploadStatus === 'success' ? (
            <CheckCircle size={40} style={{ color: 'var(--color-emerald)', margin: '0 auto' }} />
          ) : uploadStatus === 'error' ? (
            <AlertCircle size={40} style={{ color: 'var(--color-rose)', margin: '0 auto' }} />
          ) : (
            <Upload size={40} style={{ color: 'var(--color-violet-light)', margin: '0 auto' }} />
          )}
        </div>

        {uploadStatus === 'uploading' ? (
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
              Ingesting document...
            </p>
            <div className="progress-bar-track" style={{ maxWidth: 240, margin: '0 auto 8px' }}>
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{uploadProgress}%</p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-emerald)', marginBottom: 4 }}>
              Document indexed successfully!
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Drop another file to upload
            </p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-rose)', marginBottom: 4 }}>
              Upload failed
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Please check the file format and try again
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
              {isDragActive ? 'Drop your document here' : 'Drag & drop or click to upload'}
            </p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['PDF', 'DOCX', 'TXT', 'MD'].map((ext) => (
                <span key={ext} className="badge badge-violet">{ext}</span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10 }}>
              Max 50 MB · Chunked at 800 tokens · Indexed in Pinecone
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
