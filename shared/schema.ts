import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Document schema for storing editor documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").default("Untitled"),
  content: jsonb("content").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id").references(() => users.id),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  content: true,
  userId: true,
});

export const updateDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  content: true,
  updatedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Document block for the editor structure
export const blockSchema = z.object({
  id: z.string(),
  type: z.enum([
    "paragraph", 
    "heading1", 
    "heading2", 
    "heading3", 
    "title", 
    "code", 
    "markdown"
  ]),
  content: z.string(),
});

export type Block = z.infer<typeof blockSchema>;
