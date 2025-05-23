/**
 * Extracts plain text from markdown content by removing common markdown syntax
 * 
 * @param markdownText The markdown text to convert to plain text
 * @returns Plain text without markdown syntax
 */
export const extractPlainTextFromMarkdown = (markdownText: string): string => {
  if (!markdownText) return '';
  
  let plainText = markdownText;
  
  // Remove code blocks
  plainText = plainText.replace(/```[\s\S]*?```/g, 'code block');
  
  // Remove inline code
  plainText = plainText.replace(/`([^`]+)`/g, '$1');
  
  // Remove headers
  plainText = plainText.replace(/#{1,6}\s+(.+)/g, '$1');
  
  // Remove bold/italic
  plainText = plainText.replace(/(\*\*|__)(.*?)\1/g, '$2'); // Bold
  plainText = plainText.replace(/(\*|_)(.*?)\1/g, '$2');    // Italic
  
  // Remove links but keep the text
  plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove images
  plainText = plainText.replace(/!\[([^\]]+)\]\([^)]+\)/g, 'image: $1');
  
  // Remove blockquotes
  plainText = plainText.replace(/^\s*>\s+(.+)/gm, '$1');
  
  // Remove horizontal rules
  plainText = plainText.replace(/^\s*[-*_]{3,}\s*$/gm, '');
  
  // Convert list items to simple text
  plainText = plainText.replace(/^\s*[-*+]\s+(.+)/gm, '$1');
  plainText = plainText.replace(/^\s*\d+\.\s+(.+)/gm, '$1');
  
  // Remove HTML tags
  plainText = plainText.replace(/<[^>]*>/g, '');
  
  // Remove extra whitespace
  plainText = plainText.replace(/\s+/g, ' ').trim();
  
  return plainText;
};
