import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Tag,
  Building,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/hooks/use-auth-store';
import type { Expense, User as UserType } from '@shared/types';
import { cn } from '@/lib/utils';
const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('');
export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [expenseUser, setExpenseUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  useEffect(() => {
    const fetchExpense = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const expenseData = await api<Expense>(`/api/expenses/${id}`);
        setExpense(expenseData);
        const userData = await api<UserType>(`/api/users/${expenseData.userId}`);
        setExpenseUser(userData);
      } catch (error) {
        toast.error('Failed to load expense details.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchExpense();
  }, [id]);
  const handleAction = async (action: 'approve' | 'reject') => {
    if (!id || !currentUser) return;
    setIsActioning(true);
    const promise = api(`/api/expenses/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ approverId: currentUser.id }),
    });
    toast.promise(promise, {
      loading: `Processing ${action}...`,
      success: (updatedExpense: Expense) => {
        setExpense(updatedExpense);
        setIsActioning(false);
        return `Expense ${action}d successfully!`;
      },
      error: (err) => {
        setIsActioning(false);
        return `Failed to ${action} expense. ${err.message}`;
      },
    });
  };
  const getStatusBadgeVariant = (status: Expense['status']) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!expense || !expenseUser) {
    return <div>Expense not found.</div>;
  }
  const canTakeAction = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin') && expense.status === 'pending';
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Expenses
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expense Details</h1>
          <Badge variant={getStatusBadgeVariant(expense.status)} className={cn(
            'capitalize text-lg px-4 py-1',
            expense.status === 'approved' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
          )}>
            {expense.status}
          </Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{expense.merchant}</CardTitle>
          <CardDescription>Submitted by {expenseUser.name} on {new Date(expense.date).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
            <div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-muted-foreground" /> <span>{expense.amount.toFixed(2)} {expense.currency}</span></div>
            <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-muted-foreground" /> <span>{new Date(expense.date).toLocaleDateString()}</span></div>
            <div className="flex items-center gap-3"><Tag className="h-5 w-5 text-muted-foreground" /> <span>{expense.category}</span></div>
            <div className="flex items-center gap-3"><User className="h-5 w-5 text-muted-foreground" /> <span>{expenseUser.name}</span></div>
          </div>
          {expense.description && (
            <>
              <Separator className="my-6" />
              <p className="text-muted-foreground">{expense.description}</p>
            </>
          )}
        </CardContent>
      </Card>
      {expense.history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Approval History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-6">
              {expense.history.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${step.approverName}`} />
                    <AvatarFallback>{getInitials(step.approverName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{step.approverName}
                      <span className={`ml-2 font-normal ${step.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                        {step.status}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{new Date(step.timestamp).toLocaleString()}</p>
                    {step.notes && <p className="mt-1 text-sm italic flex items-center gap-2"><MessageSquare className="h-4 w-4" /> "{step.notes}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {canTakeAction && (
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={() => handleAction('approve')} disabled={isActioning} className="bg-green-600 hover:bg-green-700">
              {isActioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Approve
            </Button>
            <Button variant="destructive" onClick={() => handleAction('reject')} disabled={isActioning}>
              {isActioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Reject
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}