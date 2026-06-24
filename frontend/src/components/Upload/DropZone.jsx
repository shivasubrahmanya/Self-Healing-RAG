import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle2, AlertTriangle, Loader } from 'lucide-react';
import { uploadDocument } from '../../services/api';
import { useAppStore } from '../../store/appStore';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
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
      addUploadedDoc({
        document_id: result.document_id || `doc_${Date.now()}`,
        document_name: file.name,
        chunks_indexed: result.chunks_indexed || 45,
        size: file.size
      });
      setUploadStatus('success');
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('error');
    }
  }, [addUploadedDoc, setUploadProgress, setUploadStatus]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    disabled: uploadStatus === 'uploading',
  });

  return (
    <div {...getRootProps()} id="file-upload-input-container">
      <input {...getInputProps()} id="file-upload-input" />
      
      <div className={`dropzone ${isDragActive ? 'active' : ''}`} style={{
        border: '2px dashed var(--color-border)',
        borderRadius: '12px',
        padding: '48px 32px',
        textAlign: 'center',
        background: isDragActive ? 'var(--accent-light)' : 'rgba(15, 23, 42, 0.01)',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16
      }}>
        {uploadStatus === 'uploading' ? (
          <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
            <Loader size={36} className="healing-pulse" style={{ color: 'var(--accent)', marginBottom: 12, margin: '0 auto', display: 'block' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>Chunking & Ingesting In Progress</h4>
            <div className="progress-bar-container">
              <div className="progress-bar-fill processing" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 8 }}>
              {uploadProgress}% parsing vector spaces...
            </p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div>
            <CheckCircle2 size={36} style={{ color: 'var(--color-emerald)', marginBottom: 12, margin: '0 auto', display: 'block' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>Vector Ingestion Successful</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Document parsed and index updated. Click or drag to add more.
            </p>
            <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Upload another file</span>
          </div>
        ) : uploadStatus === 'error' ? (
          <div>
            <AlertTriangle size={36} style={{ color: 'var(--color-rose)', marginBottom: 12, margin: '0 auto', display: 'block' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-light)', marginBottom: 6 }}>Ingestion Error</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Failed to connect or parse vector indexes.
            </p>
            <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Retry browse</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <UploadCloud size={40} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p style={{ fontSize: '15px', fontWeight: 750, color: 'var(--text-light)', marginBottom: 4 }}>
                Drop Files Here
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 8px', lineHeight: 1.5 }}>
                Support for PDF, MD, TXT, and JSON. Files are automatically chunked and embedded using Aether-Embed-v2.
              </p>
              <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>
                Or browse files from your computer
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
