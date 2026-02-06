import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { Message } from '@/hooks/useEdiChat';
import { EdiSongCard } from './EdiSongCard';
import { FeedbackButtons } from './FeedbackButtons';
import { parseFollowUps } from '@/lib/parseFollowUps';

// Minimal marker format from backend (ID-only to prevent hallucination)
interface SongMarker {
  song_id: number;
  difficulty: string;
  eamuse_id: string | null;
}

// Hydrated song data after looking up from database
interface HydratedSong {
  song_id: number;
  title: string;
  difficulty: string;
  level: number;
  eamuse_id: string | null;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  getUserScore?: (songId: number, difficultyName: string) => {
    score: number | null;
    rank: string | null;
    flare: number | null;
    halo: string | null;
  } | null;
  // Lookup function to hydrate song data from database
  // Returns null if song not found (hallucinated)
  getSongData?: (songId: number, difficultyName: string) => {
    title: string;
    level: number;
    eamuse_id: string | null;
  } | null;
  onSongClick?: (song: HydratedSong) => void;
  userPrompt?: string;
  conversationContext?: { role: string; content: string }[];
}

type ParsedPart = { type: 'text'; value: string } | { type: 'song'; value: SongMarker };

/**
 * Parse message content for [[SONG:...]] patterns
 * Returns array of text and song marker parts for rendering
 * The marker only contains IDs - frontend must hydrate full data from database
 */
function parseMessageContent(content: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const regex = /\[\[SONG:(.*?)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push({ type: 'text', value: textBefore });
      }
    }

    // Parse the song JSON (now ID-only marker format)
    try {
      const markerData = JSON.parse(match[1]) as SongMarker;
      // Validate required fields exist
      if (markerData.song_id && markerData.difficulty) {
        parts.push({ type: 'song', value: markerData });
      } else {
        // Invalid marker, keep as text
        parts.push({ type: 'text', value: match[0] });
      }
    } catch {
      // If JSON fails, keep as text
      parts.push({ type: 'text', value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      parts.push({ type: 'text', value: remaining });
    }
  }

  return parts;
}

/**
 * Check if content contains incomplete song markers (for streaming)
 */
function hasIncompleteMarker(content: string): boolean {
  const openCount = (content.match(/\[\[SONG:/g) || []).length;
  const closeCount = (content.match(/\]\]/g) || []).length;
  return openCount > closeCount;
}

export function ChatMessage({
  message,
  isStreaming,
  getUserScore,
  getSongData,
  onSongClick,
  userPrompt,
  conversationContext,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const showFeedback = isAssistant && !isStreaming && message.content.length > 0 && userPrompt;

  // For user messages, render directly
  if (isUser) {
    return (
      <div className="flex w-full justify-end px-4">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-primary text-primary-foreground rounded-br-md">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // For assistant messages, parse for song cards (remove follow-up markers)
  const rawContent = message.content;
  const { cleanContent: contentWithoutFollowups } = parseFollowUps(rawContent);
  
  // During streaming with incomplete marker, show raw content
  if (isStreaming && hasIncompleteMarker(rawContent)) {
    return (
      <div className="flex w-full justify-start px-4">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-secondary text-foreground rounded-bl-md">
          <div className="prose prose-sm prose-invert max-w-none">
            <p className="mb-0 text-sm">{rawContent}</p>
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Empty streaming state
  if (!message.content && isStreaming) {
    return (
      <div className="flex w-full justify-start px-4">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-secondary text-foreground rounded-bl-md">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  const parsedContent = parseMessageContent(contentWithoutFollowups);
  const hasSongs = parsedContent.some(p => p.type === 'song');

  return (
    <div className="flex w-full justify-start px-4">
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          'bg-secondary text-foreground rounded-bl-md',
          hasSongs && 'w-full max-w-none mx-0'
        )}
      >
        {parsedContent.map((part, index) => {
          if (part.type === 'text') {
            // Filter out sanbai rating markers like [sb:16.60]
            const cleanedText = part.value.replace(/\[sb:[\d.]+\]/gi, '').trim();
            if (!cleanedText) return null;
            
            return (
              <div key={index} className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 text-sm">{children}</p>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-primary">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-none mb-2 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-none mb-2 space-y-1">{children}</ol>
                    ),
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-2 text-foreground">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold mb-2 text-foreground">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mb-1 text-foreground">{children}</h3>
                    ),
                    code: ({ children }) => (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {cleanedText}
                </ReactMarkdown>
              </div>
            );
          } else {
            // Hydrate song data from database using the marker IDs
            const marker = part.value;
            const songData = getSongData?.(marker.song_id, marker.difficulty);

            // If song not found in database, it was hallucinated - skip rendering
            if (!songData) {
              console.warn(`Skipping hallucinated song: song_id=${marker.song_id}, difficulty=${marker.difficulty}`);
              return null;
            }

            // Build hydrated song object
            // Primary source for eamuse_id is the database (songData); marker is fallback
            const hydratedSong: HydratedSong = {
              song_id: marker.song_id,
              title: songData.title,
              difficulty: marker.difficulty,
              level: songData.level,
              eamuse_id: songData.eamuse_id || marker.eamuse_id || null,
            };

            const userScore = getUserScore?.(marker.song_id, marker.difficulty) ?? null;
            return (
              <EdiSongCard
                key={`song-${index}-${marker.song_id}`}
                songId={hydratedSong.song_id}
                title={hydratedSong.title}
                difficultyName={hydratedSong.difficulty}
                difficultyLevel={hydratedSong.level}
                eamuseId={hydratedSong.eamuse_id}
                userScore={userScore}
                onClick={() => onSongClick?.(hydratedSong)}
              />
            );
          }
        })}
        
        {/* Streaming cursor */}
        {isStreaming && rawContent && !hasIncompleteMarker(rawContent) && (
          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
        )}

        {/* Feedback buttons for completed assistant messages */}
        {showFeedback && (
          <FeedbackButtons
            messageContent={message.content}
            userPrompt={userPrompt}
            conversationContext={conversationContext}
          />
        )}
      </div>
    </div>
  );
}
