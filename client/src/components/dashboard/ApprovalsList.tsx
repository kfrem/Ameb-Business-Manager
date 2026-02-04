import { Check, X, Clock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/constants';
import type { Approval } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ApprovalsListProps {
  approvals: Approval[];
  limit?: number;
}

export function ApprovalsList({ approvals, limit }: ApprovalsListProps) {
  const { toast } = useToast();
  const displayApprovals = limit ? approvals.filter(a => a.status === 'pending').slice(0, limit) : approvals;

  const handleApproval = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approved' | 'rejected' }) => {
      return apiRequest('POST', `/api/approvals/${id}/${action}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/approvals'] });
      toast({ title: 'Decision recorded' });
    },
    onError: () => {
      toast({ title: 'Failed to process', variant: 'destructive' });
    },
  });

  if (displayApprovals.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No pending approvals</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {displayApprovals.map(approval => (
        <Card key={approval.id} className="p-4" data-testid={`approval-${approval.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg">
                {formatCurrency(parseFloat(approval.amount))}
              </p>
              {approval.reason && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {approval.reason}
                </p>
              )}
              <Badge variant="outline" className="mt-2">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <Button
                size="icon"
                variant="outline"
                className="h-12 w-12 rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleApproval.mutate({ id: approval.id, action: 'rejected' })}
                disabled={handleApproval.isPending}
                data-testid={`button-reject-${approval.id}`}
              >
                <X className="w-6 h-6" />
              </Button>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700"
                onClick={() => handleApproval.mutate({ id: approval.id, action: 'approved' })}
                disabled={handleApproval.isPending}
                data-testid={`button-approve-${approval.id}`}
              >
                <Check className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
      
      {limit && approvals.filter(a => a.status === 'pending').length > limit && (
        <Button variant="ghost" className="w-full" asChild>
          <a href="/approvals">
            View all pending approvals
            <ChevronRight className="w-4 h-4 ml-1" />
          </a>
        </Button>
      )}
    </div>
  );
}
