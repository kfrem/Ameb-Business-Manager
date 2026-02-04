import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatCompactNumber } from '@/lib/constants';

interface BarChartProps {
  title?: string;
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  horizontal?: boolean;
}

const COLORS = [
  'hsl(142, 76%, 42%)',
  'hsl(217, 91%, 60%)',
  'hsl(45, 93%, 55%)',
  'hsl(280, 67%, 55%)',
  'hsl(12, 76%, 55%)',
];

export function BarChartComponent({ title, data, height = 200, horizontal = false }: BarChartProps) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
          >
            {horizontal ? (
              <>
                <XAxis type="number" tickFormatter={formatCompactNumber} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCompactNumber} />
              </>
            )}
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || COLORS[index % COLORS.length]} 
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
