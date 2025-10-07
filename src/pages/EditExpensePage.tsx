import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import type { Expense } from '@shared/types';
export function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchExpense = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const expenseData = await api<Expense>(`/api/expenses/${id}`);
        setExpense(expenseData);
      } catch (error) {
        toast.error('Failed to load expense for editing.');
        navigate('/expenses');
      } finally {
        setLoading(false);
      }
    };
    fetchExpense();
  }, [id, navigate]);
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Edit Expense</h1>
        <p className="text-muted-foreground">
          Update the details of your expense claim below.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
          <CardDescription>Modify the fields and save your changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-8">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <ExpenseForm expense={expense} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}