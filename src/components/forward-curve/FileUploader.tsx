
import React from 'react';
import { motion } from "framer-motion";
import { Upload } from "lucide-react";

interface FileUploaderProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const FileUploader = ({ onFileUpload, disabled }: FileUploaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-medium">Charger les fichiers CSV</h3>
      <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
        <input
          type="file"
          multiple
          accept=".csv"
          onChange={onFileUpload}
          disabled={disabled}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center gap-2 cursor-pointer ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
          }`}
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Glissez vos fichiers CSV ici ou cliquez pour sélectionner
          </span>
        </label>
      </div>
    </motion.div>
  );
};

export default FileUploader;
