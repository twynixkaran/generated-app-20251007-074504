import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/hooks/use-auth-store';
import type { Expense } from '@shared/types';
const expenseFormSchema = z.object({
  merchant: z.string().min(2, { message: 'Merchant name must be at least 2 characters.' }),
  amount: z.coerce.number().positive({ message: 'Amount must be a positive number.' }),
  date: z.date({
    required_error: 'A date is required.',
  }),
  category: z.string().min(1, { message: 'Please select a category.' }),
  description: z.string().optional(),
  receiptUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});
type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
const categories = ['Meals', 'Travel', 'Software', 'Office Supplies', 'Utilities', 'Other'];
interface ExpenseFormProps {
  expense?: Expense | null;
}
export function ExpenseForm({ expense }: ExpenseFormProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isEditMode = !!expense;
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: isEditMode
      ? {
          ...expense,
          date: new Date(expense.date),
        }
      : {
          merchant: '',
          amount: undefined,
          date: new Date(),
          description: '',
          category: '',
          receiptUrl: '',
        },
  });
  const onSubmit = async (values: ExpenseFormValues) => {
    if (!currentUser) {
      toast.error('You must be logged in to submit an expense.');
      return;
    }
    const submissionData = {
      ...values,
      userId: currentUser.id,
      date: values.date.getTime(),
    };
    const apiCall = isEditMode
      ? api(`/api/expenses/${expense.id}`, {
          method: 'PUT',
          body: JSON.stringify(submissionData),
        })
      : api('/api/expenses', {
          method: 'POST',
          body: JSON.stringify(submissionData),
        });
    const promise = apiCall;
    toast.promise(promise, {
      loading: isEditMode ? 'Updating expense...' : 'Submitting expense...',
      success: () => {
        navigate('/expenses', { state: { refresh: true } });
        return `Expense ${isEditMode ? 'updated' : 'submitted'} successfully!`;
      },
      error: (err) => `Failed to ${isEditMode ? 'update' : 'submit'} expense. ${err.message}`,
    });
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="merchant"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cloudflare Cafe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (USD)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 25.50" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Expense</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief description of the expense (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="receiptUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receipt</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-grow space-y-2">
                    <Input placeholder="https://example.com/receipt.jpg" {...field} />
                    <FormDescription>
                      Mock upload: paste an image URL.
                    </FormDescription>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/expenses')}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Save Changes' : 'Submit Expense'}
          </Button>
        </div>
      </form>
    </Form>
  );
}