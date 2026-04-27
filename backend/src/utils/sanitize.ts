export const sanitizeString = (str: string | undefined | null): string => {
  if (!str) return '';
  let sanitized = str.replace(/<\/?(?:script|iframe|object|embed|applet|meta|link|style)[^>]*>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
  sanitized = sanitized.replace(/on\w+=\w+/gi, '');
  return sanitized;
};
