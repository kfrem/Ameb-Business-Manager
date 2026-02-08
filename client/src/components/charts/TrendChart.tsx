import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatCompactNumber } from '@/lib/constants';

interface TrendDataPoint {
  month: string;      // "Jan", "Feb", etc.
  monthFull: string;  // "January 2025"
  revenue: number;
  expenses: number;
  profit: number;
}

interface TrendChartProps {
  title?: string;
  data: TrendDataPoint[];
  height?: number;
}

export function TrendChart({ title = 'Money Flow', data, height = 220 }: TrendChartProps) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">Last 6 months: Revenue vs Expenses</p>
        </CardHeader>
      )}
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 42%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 42%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatCompactNumber} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'revenue' ? 'Money In' : name === 'expenses' ? 'Money Out' : 'Profit'
              ]}
              labelFormatter={(label) => {
                const point = data.find(d => d.month === label);
                return point?.monthFull || label;
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(142, 76%, 42%)"
              strokeWidth={2.5}
              fill="url(#colorRevenue)"
              name="revenue"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="hsl(0, 72%, 51%)"
              strokeWidth={2.5}
              fill="url(#colorExpenses)"
              name="expenses"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Money In</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Money Out</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
