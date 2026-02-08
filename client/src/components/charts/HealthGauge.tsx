import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HealthGaugeProps {
  score: number; // 0-100
  label?: string;
  onClick?: () => void;
}

function getScoreColor(score: number) {
  if (score >= 70) return { fill: 'hsl(142, 76%, 42%)', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', word: 'Healthy' };
  if (score >= 40) return { fill: 'hsl(45, 93%, 47%)', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', word: 'Needs Attention' };
  return { fill: 'hsl(0, 72%, 51%)', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', word: 'At Risk' };
}

export function HealthGauge({ score, label = 'Business Health', onClick }: HealthGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const color = getScoreColor(clampedScore);

  const data = [
    { name: 'score', value: clampedScore, fill: color.fill },
  ];

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        color.bg, color.border,
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <p className="text-center text-sm font-medium text-muted-foreground mb-2">{label}</p>
        <div className="relative" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              startAngle={210}
              endAngle={-30}
              data={data}
              barSize={16}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={8}
                background={{ fill: 'hsl(var(--muted))' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Center text overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-5xl font-bold", color.text)}>
              {clampedScore}
            </span>
            <span className={cn("text-sm font-medium mt-1", color.text)}>
              {color.word}
            </span>
          </div>
        </div>

        {onClick && (
          <p className="text-center text-[10px] text-muted-foreground mt-1">
            Tap to see what affects your score
          </p>
        )}
      </CardContent>
    </Card>
  );
}
