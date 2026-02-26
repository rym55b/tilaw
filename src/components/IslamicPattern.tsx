import { cn } from '@/lib/utils';

interface IslamicPatternProps {
  className?: string;
  opacity?: number;
}

export function IslamicPattern({ className, opacity = 0.06 }: IslamicPatternProps) {
  return (
    <svg
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="islamic-geo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path
            d="M40 0L50 10L40 20L30 10Z M0 40L10 30L20 40L10 50Z M40 40L50 30L60 40L50 50Z M80 40L70 30L60 40L70 50Z M40 80L50 70L40 60L30 70Z M20 20L30 30L20 40L10 30Z M60 20L70 30L60 40L50 30Z M20 60L30 50L20 40L10 50Z M60 60L70 50L60 40L50 50Z"
            fill="currentColor"
            opacity={opacity}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#islamic-geo)" />
    </svg>
  );
}
