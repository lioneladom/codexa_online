'use client';

import { Editor } from '@monaco-editor/react';
import { useState } from 'react';

interface CodeEditorProps {
  language?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  height?: string;
}

export default function CodeEditor({
  language = 'javascript',
  value = '',
  onChange,
  height = '400px',
}: CodeEditorProps) {
  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
