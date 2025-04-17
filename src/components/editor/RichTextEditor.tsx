import React, { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode, EditorState } from 'lexical';
import './RichTextEditor.css';

// Simple toolbar button component
const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}> = ({ onClick, active, children }) => (
  <button
    className={`toolbar-button ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
);

// Simple toolbar component
const Toolbar: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isCode, setIsCode] = useState(false);

  // Update toolbar state based on selection
  useEffect(() => {
    const unregisterListener = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          // This is a simplified implementation
          // In a real app, you'd check the actual formatting of the selection
          setIsBold(false);
          setIsItalic(false);
          setIsCode(false);
        });
      }
    );

    return unregisterListener;
  }, [editor]);

  // Format handlers
  const formatBold = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        selection.formatText('bold');
      }
    });
  };

  const formatItalic = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        selection.formatText('italic');
      }
    });
  };

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        selection.formatText('code');
      }
    });
  };

  return (
    <div className="editor-toolbar">
      <ToolbarButton onClick={formatBold} active={isBold}>
        <i className="fas fa-bold"></i>
      </ToolbarButton>
      <ToolbarButton onClick={formatItalic} active={isItalic}>
        <i className="fas fa-italic"></i>
      </ToolbarButton>
      <ToolbarButton onClick={formatCode} active={isCode}>
        <i className="fas fa-code"></i>
      </ToolbarButton>
    </div>
  );
};

// Editor configuration
const editorConfig = {
  namespace: 'SBCGPTEditor',
  theme: {
    root: 'editor-root',
    text: {
      bold: 'editor-text-bold',
      italic: 'editor-text-italic',
      code: 'editor-text-code',
    },
  },
  onError: (error: Error) => {
    console.error('Editor error:', error);
  },
};

// Placeholder component
const Placeholder: React.FC = () => {
  return <div className="editor-placeholder">Enter your message...</div>;
};

interface RichTextEditorProps {
  onChange?: (text: string, html: string) => void;
  onSubmit?: (text: string, html: string) => void;
  placeholder?: string;
  initialValue?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onChange,
  onSubmit,
  placeholder,
  initialValue = '',
}) => {
  // Handle editor changes
  const handleEditorChange = (editorState: EditorState) => {
    editorState.read(() => {
      const root = $getRoot();
      const text = root.getTextContent();
      
      // This is a simplified approach to get HTML
      // In a real app, you'd use a proper serialization method
      const html = text; // For now, just use plain text
      
      if (onChange) {
        onChange(text, html);
      }
    });
  };

  // Handle key press for submission
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
      event.preventDefault();
      
      const editor = document.querySelector('[contenteditable=true]');
      if (editor) {
        const text = editor.textContent || '';
        const html = editor.innerHTML || '';
        
        onSubmit(text, html);
        
        // Clear the editor
        const [lexicalEditor] = useLexicalComposerContext();
        lexicalEditor.update(() => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        });
      }
    }
  };

  return (
    <div className="rich-text-editor">
      <LexicalComposer initialConfig={editorConfig}>
        <div className="editor-container">
          <Toolbar />
          <div className="editor-inner" onKeyPress={handleKeyPress}>
            <RichTextPlugin
              contentEditable={<ContentEditable className="editor-input" />}
              placeholder={<Placeholder />}
            />
            <HistoryPlugin />
            <OnChangePlugin onChange={handleEditorChange} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
};

export default RichTextEditor;
