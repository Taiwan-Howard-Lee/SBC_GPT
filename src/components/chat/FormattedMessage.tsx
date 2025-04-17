import React from 'react';
import DOMPurify from 'dompurify';

interface FormattedMessageProps {
  content: string;
  isHtml?: boolean;
}

const FormattedMessage: React.FC<FormattedMessageProps> = ({ 
  content, 
  isHtml = false 
}) => {
  // If the content is HTML, sanitize it and render it
  if (isHtml) {
    const sanitizedHtml = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'code', 'pre', 'p', 'br', 'span', 'div'],
      ALLOWED_ATTR: ['class', 'style']
    });
    
    return (
      <div 
        className="formatted-message"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
      />
    );
  }
  
  // If it's plain text, just render it
  return <div className="formatted-message">{content}</div>;
};

export default FormattedMessage;
