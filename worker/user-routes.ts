import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity, ExpenseEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import { User, Expense, ApprovalStep, UserRole } from "@shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  // Ensure seed data is present on first load
  app.use('/api/*', async (c, next) => {
    await Promise.all([
      UserEntity.ensureSeed(c.env),
      ExpenseEntity.ensureSeed(c.env)
    ]);
    await next();
  });
  // USERS
  app.get('/api/users', async (c) => {
    const page = await UserEntity.list(c.env);
    return ok(c, page.items);
  });
  app.get('/api/users/:id', async (c) => {
    const id = c.req.param('id');
    const userEntity = new UserEntity(c.env, id);
    if (!(await userEntity.exists())) {
      return notFound(c, 'User not found');
    }
    const user = await userEntity.getState();
    return ok(c, user);
  });
  app.put('/api/users/:id/role', async (c) => {
    const targetUserId = c.req.param('id');
    const { role, adminId } = await c.req.json<{ role: UserRole, adminId: string }>();
    if (!adminId) {
      return bad(c, 'Admin ID is required for authorization.');
    }
    if (!role || !['employee', 'manager', 'admin'].includes(role)) {
      return bad(c, 'Invalid role specified.');
    }
    const adminEntity = new UserEntity(c.env, adminId);
    if (!(await adminEntity.exists())) {
      return notFound(c, 'Admin user not found.');
    }
    const adminUser = await adminEntity.getState();
    if (adminUser.role !== 'admin') {
      return c.json({ success: false, error: 'Unauthorized: Only admins can change user roles.' }, 403);
    }
    const targetUserEntity = new UserEntity(c.env, targetUserId);
    if (!(await targetUserEntity.exists())) {
      return notFound(c, 'Target user not found.');
    }
    try {
      const updatedUser = await targetUserEntity.mutate(user => ({ ...user, role }));
      return ok(c, updatedUser);
    } catch (error) {
      console.error('Failed to update user role:', error);
      return c.json({ success: false, error: 'Failed to update user role' }, 500);
    }
  });
  // EXPENSES
  app.get('/api/expenses', async (c) => {
    const userId = c.req.query('userId');
    const userRole = c.req.query('role');
    const { items: allExpenses } = await ExpenseEntity.list(c.env);
    if (userRole === 'admin' || userRole === 'manager') {
      // Admins and managers can see all expenses
      return ok(c, allExpenses.sort((a, b) => b.date - a.date));
    }
    if (userId) {
      // Employees see only their own expenses
      const userExpenses = allExpenses.filter(exp => exp.userId === userId);
      return ok(c, userExpenses.sort((a, b) => b.date - a.date));
    }
    return bad(c, 'A userId or admin/manager role is required to fetch expenses.');
  });
  app.get('/api/expenses/:id', async (c) => {
    const id = c.req.param('id');
    const expenseEntity = new ExpenseEntity(c.env, id);
    if (!(await expenseEntity.exists())) {
      return notFound(c, 'Expense not found');
    }
    const expense = await expenseEntity.getState();
    return ok(c, expense);
  });
  app.post('/api/expenses', async (c) => {
    const body = await c.req.json();
    // Basic validation
    if (!body.userId || !body.merchant || !body.amount || !body.date || !body.category) {
      return bad(c, 'Missing required expense fields.');
    }
    const newExpense: Expense = {
      id: `exp-${crypto.randomUUID()}`,
      userId: body.userId,
      merchant: body.merchant,
      amount: body.amount,
      currency: body.currency || 'USD',
      date: body.date,
      description: body.description || '',
      status: 'pending',
      category: body.category,
      history: [],
    };
    try {
      const createdExpense = await ExpenseEntity.create(c.env, newExpense);
      return ok(c, createdExpense);
    } catch (error) {
      console.error('Failed to create expense:', error);
      return c.json({ success: false, error: 'Failed to create expense' }, 500);
    }
  });
  // APPROVAL WORKFLOW
  const handleApprovalAction = async (c: any, action: 'approved' | 'rejected') => {
    const expenseId = c.req.param('id');
    const { approverId, notes } = await c.req.json();
    if (!approverId) {
      return bad(c, 'Approver ID is required.');
    }
    const approverEntity = new UserEntity(c.env, approverId);
    if (!(await approverEntity.exists())) {
      return notFound(c, 'Approver user not found.');
    }
    const approver = await approverEntity.getState();
    if (approver.role !== 'manager' && approver.role !== 'admin') {
      return c.json({ success: false, error: 'User does not have approval permissions.' }, 403);
    }
    const expenseEntity = new ExpenseEntity(c.env, expenseId);
    if (!(await expenseEntity.exists())) {
      return notFound(c, 'Expense not found.');
    }
    const updatedExpense = await expenseEntity.mutate((expense) => {
      if (expense.status !== 'pending') {
        // To prevent race conditions or double-actions
        throw new Error('This expense has already been actioned.');
      }
      const historyEntry: ApprovalStep = {
        approverId: approver.id,
        approverName: approver.name,
        status: action,
        timestamp: Date.now(),
        notes: notes || (action === 'approved' ? 'Approved' : 'Rejected'),
      };
      return {
        ...expense,
        status: action,
        history: [...expense.history, historyEntry],
      };
    });
    return ok(c, updatedExpense);
  };
  app.post('/api/expenses/:id/approve', async (c) => {
    try {
      return await handleApprovalAction(c, 'approved');
    } catch (error: any) {
      return bad(c, error.message);
    }
  });
  app.post('/api/expenses/:id/reject', async (c) => {
    try {
      return await handleApprovalAction(c, 'rejected');
    } catch (error: any) {
      return bad(c, error.message);
    }
  });
}