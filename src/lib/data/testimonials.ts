import { randomUUID } from "node:crypto";
import type { Testimonial } from "@/types";
import { mutateDb, readDb } from "./store";

export async function getPublishedTestimonials(): Promise<Testimonial[]> {
  const db = readDb();
  return db.testimonials.filter((t) => t.isPublished).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function getAllTestimonials(): Promise<Testimonial[]> {
  const db = readDb();
  return [...db.testimonials].sort((a, b) => a.displayOrder - b.displayOrder);
}

export interface TestimonialInput {
  customerName: string;
  rating: number;
  content: string;
  isPublished: boolean;
}

export async function createTestimonial(input: TestimonialInput): Promise<Testimonial> {
  return mutateDb((db) => {
    const testimonial: Testimonial = {
      id: randomUUID(),
      ...input,
      displayOrder: db.testimonials.length + 1,
      createdAt: new Date().toISOString(),
    };
    db.testimonials.push(testimonial);
    return testimonial;
  });
}

export async function updateTestimonial(id: string, input: Partial<TestimonialInput>): Promise<Testimonial | null> {
  return mutateDb((db) => {
    const testimonial = db.testimonials.find((t) => t.id === id);
    if (!testimonial) return null;
    Object.assign(testimonial, input);
    return testimonial;
  });
}

export async function deleteTestimonial(id: string): Promise<void> {
  mutateDb((db) => {
    db.testimonials = db.testimonials.filter((t) => t.id !== id);
  });
}
