import { Icon } from '@/components/ui/Icon';

export function WelcomeMessage() {
  return (
    <div className="flex gap-3 px-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <Icon name="smart_toy" size={24} className="text-primary" />
      </div>
      <div className="flex-1 bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
        <p className="text-sm text-foreground">
          Hey! I'm <span className="font-semibold text-primary">Edi</span>, your DDR coach. 
          I've been looking at your scores and I'm ready to help you level up!
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Ask me about your strengths, what to work on, or get personalized song recommendations.
        </p>
      </div>
    </div>
  );
}
