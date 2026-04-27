import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export const renderMarkdown = (content: string): string => {
  if (!content) return '';
  
  // parse can be async if we use async marked, but by default it's sync
  const rawHtml = marked.parse(content) as string;
  
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      'p', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'br', 
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'a'
    ],
    allowedAttributes: {
      '*': ['class', 'id'],
      'a': ['href', 'title', 'target', 'rel'],
      'code': ['class']
    }
  });
  
  return cleanHtml;
};
