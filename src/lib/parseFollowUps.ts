/**
 * Parse [[FOLLOWUP:...]] markers from message content
 * Returns clean content (markers removed) and array of follow-up suggestions
 */
export function parseFollowUps(content: string): { cleanContent: string; followUps: string[] } {
  const followUps: string[] = [];
  const regex = /\[\[FOLLOWUP:(.*?)\]\]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const suggestion = match[1].trim();
    if (suggestion) {
      followUps.push(suggestion);
    }
  }

  // Remove follow-up markers from content
  const cleanContent = content.replace(/\[\[FOLLOWUP:.*?\]\]/g, '').trim();

  return { cleanContent, followUps };
}
