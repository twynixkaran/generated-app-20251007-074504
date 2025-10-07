import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { api } from '@/lib/api-client';
import type { User, UserRole } from '@shared/types';
import { useNavigate } from 'react-router-dom';
const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('');
export function AdminSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((state) => state.currentUser);
  const navigate = useNavigate();
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      toast.error("Access Denied: You don't have permission to view this page.");
      navigate('/dashboard');
      return;
    }
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await api<User[]>('/api/users');
        setUsers(fetchedUsers);
      } catch (error) {
        toast.error('Failed to load users.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser, navigate]);
  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (!currentUser) return;
    const originalUsers = [...users];
    const updatedUsers = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setUsers(updatedUsers);
    const promise = api(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole, adminId: currentUser.id }),
    });
    toast.promise(promise, {
      loading: 'Updating user role...',
      success: (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        return `Successfully updated ${updatedUser.name}'s role.`;
      },
      error: (err) => {
        setUsers(originalUsers);
        return `Failed to update role: ${err.message}`;
      },
    });
  };
  if (currentUser?.role !== 'admin') {
    return null;
  }
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">Manage user roles and application settings.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and edit roles for all users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/8.x/lorelei/svg?seed=${user.name}`} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(newRole: UserRole) => handleRoleChange(user.id, newRole)}
                        disabled={user.id === currentUser?.id}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}