import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
        style={{
          opacity: uploadStatus === 'uploading' ? 0.7 : 1,
          border: isDragActive ? '1px solid var(--text-light)' : '1px solid var(--hairline-light)',
          background: isDragActive ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
          padding: '24px 32px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start', /* Left-aligned */
          gap: 12
        }}
      >
        <input {...getInputProps()} />

        {uploadStatus === 'uploading' ? (
          <div style={{ width: '100%' }}>
            <p className="serif-display" style={{ fontSize: 18, color: 'var(--text-light)', marginBottom: 10 }}>
              Indexing document in progress
            </p>
            <div className="progress-bar-track" style={{ maxWidth: '100%', marginBottom: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter', letterSpacing: '0.05em' }}>
              {uploadProgress}% processed
            </p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div>
            <p className="serif-display" style={{ fontSize: 18, color: 'var(--accent)', marginBottom: 6 }}>
              Document indexed successfully.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Click or drag another file to update the index.
            </p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div>
            <p className="serif-display" style={{ fontSize: 18, color: 'var(--color-rose)', marginBottom: 6 }}>
              Index ingestion failed.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Verify file format constraints and retry.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <p className="serif-display" style={{ fontSize: 20, lineHeight: 1.2, color: 'var(--text-light)' }}>
              Add a document to begin indexing
            </p>
            
            <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.5 }}>
              drag and drop your source file here, or click to browse. supported types: {' '}
              <span style={{ textDecoration: 'underline', color: 'var(--text-light)' }}>pdf</span>,{' '}
              <span style={{ textDecoration: 'underline', color: 'var(--text-light)' }}>docx</span>,{' '}
              <span style={{ textDecoration: 'underline', color: 'var(--text-light)' }}>txt</span>, and{' '}
              <span style={{ textDecoration: 'underline', color: 'var(--text-light)' }}>md</span>.
            </p>

            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              maximum file threshold 50 mb &middot; parsed using 800 token chunk limits with 150 token overlap offset
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
