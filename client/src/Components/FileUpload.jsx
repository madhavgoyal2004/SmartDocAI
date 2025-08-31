// components/FileUpload.js
import React from 'react';
import '../App.css';

const fileUpload = ({ files, setFiles }) => {
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.csv"
        id="file-input"
        style={{ display: 'none' }}
      />
      <label htmlFor="file-input" className="file-upload-button">
        📎 Attach Files
      </label>
      
      {files.length > 0 && (
        <div className="selected-files">
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <span>{file.name}</span>
              <button type="button" onClick={() => removeFile(index)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default fileUpload;
