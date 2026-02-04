import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/constants';

interface DonutChartProps {
  title?: string;
  data: Array<{ name: string; value: number; color?: string }>;
  showLegend?: boolean;
  height?: number;
}

const COLORS = [
  'hsl(142, 76%, 42%)',
  'hsl(217, 91%, 60%)',
  'hsl(45, 93%, 55%)',
  'hsl(280, 67%, 55%)',
  'hsl(12, 76%, 55%)',
  'hsl(180, 60%, 50%)',
];

export function DonutChart({ title, data, showLegend = true, height = 200 }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {showLegend && (
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-center mt-2">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{formatCurrency(total)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
