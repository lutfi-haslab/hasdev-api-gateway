import { asc, count, desc, eq, type InferSelectModel } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { todos } from "../../../../configs/db/schema.todo";

export type Todo = InferSelectModel<typeof todos>;

interface CreateTodoData {
  text: string;
  userId: string;
  planDate?: Date | null;
  isDone?: boolean;
}

interface UpdateTodoData {
  text?: string;
  isDone?: boolean;
  planDate?: Date | null;
}

export class TodoRepository {

    private db: ReturnType<typeof drizzle>;
  
    constructor(d1Database: D1Database) {
      this.db = drizzle(d1Database);
    }
  

  async create(todoData: CreateTodoData): Promise<Todo> {
    const [todo] = await this.db
      .insert(todos)
      .values({
        id: crypto.randomUUID(),
        userId: todoData.userId,
        text: todoData.text,
        isDone: todoData.isDone ? 1 : 0,
        planDate: todoData.planDate ? new Date(todoData.planDate) : null,
      })
      .returning();
    
    return todo;
  }

  async findById(id: string): Promise<Todo | null> {
    const [todo] = await this.db
      .select()
      .from(todos)
      .where(eq(todos.id, id))
      .limit(1);
    
    return todo || null;
  }

  async findAllByUserId(
    userId: string, 
    page = 1, 
    limit = 10, 
    sort: "createdAt" | "updatedAt" | "planDate" = "createdAt", 
    order: "asc" | "desc" = "desc"
  ): Promise<{ 
    todos: Todo[]; 
    pagination: { 
      page: number; 
      limit: number; 
      totalPages: number; 
      total: number 
    } 
  }> {
    const offset = (page - 1) * limit;
    
    // Get the total count of todos for the user
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(todos)
      .where(eq(todos.userId, userId));
    
    // Get paginated todos
    const todoList = await this.db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(order === 'asc' ? asc(todos[sort]) : desc(todos[sort]))
      .limit(limit)
      .offset(offset);
    
    return {
      todos: todoList,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total
      }
    };
  }

  async update(id: string, updateData: UpdateTodoData): Promise<Todo> {
    const [todo] = await this.db
      .update(todos)
      .set({
        ...updateData,
        isDone: updateData.isDone !== undefined ? (updateData.isDone ? 1 : 0) : undefined,
        updatedAt: new Date()
      })
      .where(eq(todos.id, id))
      .returning();
    
    if (!todo) {
      throw new Error(`Todo with id ${id} not found`);
    }
    
    return todo;
  }

  async delete(id: string): Promise<boolean> {
    const [deletedTodo] = await this.db
      .delete(todos)
      .where(eq(todos.id, id))
      .returning({ id: todos.id });
    
    return !!deletedTodo;
  }
}