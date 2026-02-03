import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface FeedbackButtonsProps {
  messageContent: string;
  userPrompt: string;
  conversationContext?: { role: string; content: string }[];
}

export function FeedbackButtons({
  messageContent,
  userPrompt,
  conversationContext,
}: FeedbackButtonsProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [expectedResponse, setExpectedResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRating = async (newRating: 'positive' | 'negative') => {
    if (!user) return;
    
    setRating(newRating);
    
    if (newRating === 'negative') {
      // Show modal for negative feedback to collect more info
      setShowFeedbackModal(true);
    } else {
      // Submit positive feedback immediately
      await submitFeedback(newRating, null);
    }
  };

  const submitFeedback = async (feedbackRating: 'positive' | 'negative', expected: string | null) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('edi_feedback').insert({
        user_id: user.id,
        message_content: messageContent,
        user_prompt: userPrompt,
        rating: feedbackRating,
        expected_response: expected,
        conversation_context: conversationContext,
      });

      if (error) throw error;
      
      toast.success(
        feedbackRating === 'positive' 
          ? 'Thanks for the feedback!' 
          : 'Feedback submitted - this helps improve Edi!',
        { duration: 3000 }
      );
      setShowFeedbackModal(false);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      toast.error('Failed to submit feedback');
      setRating(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitNegativeFeedback = () => {
    submitFeedback('negative', expectedResponse || null);
  };

  if (rating !== null && !showFeedbackModal) {
    // Already submitted
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
        <Icon name="check" size={16} />
        <span>Feedback recorded</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 mt-2">
        <button
          onClick={() => handleRating('positive')}
          disabled={rating !== null}
          className={cn(
            'p-1.5 rounded-lg transition-all',
            'hover:bg-primary/20 active:scale-95',
            rating === 'positive' && 'bg-primary/20 text-primary'
          )}
          aria-label="Good response"
        >
          <Icon name="thumb_up" size={16} className="opacity-60 hover:opacity-100" />
        </button>
        <button
          onClick={() => handleRating('negative')}
          disabled={rating !== null}
          className={cn(
            'p-1.5 rounded-lg transition-all',
            'hover:bg-destructive/20 active:scale-95',
            rating === 'negative' && 'bg-destructive/20 text-destructive'
          )}
          aria-label="Bad response"
        >
          <Icon name="thumb_down" size={16} className="opacity-60 hover:opacity-100" />
        </button>
      </div>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Help improve Edi</DialogTitle>
            <DialogDescription>
              What did you expect Edi to say? This feedback helps us make better recommendations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
              <p className="text-muted-foreground mb-1 text-xs">Your question:</p>
              <p className="line-clamp-2">{userPrompt}</p>
            </div>
            
            <Textarea
              placeholder="What response would have been more helpful? (optional)"
              value={expectedResponse}
              onChange={(e) => setExpectedResponse(e.target.value)}
              rows={4}
              className="resize-none"
            />
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setRating(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitNegativeFeedback}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
