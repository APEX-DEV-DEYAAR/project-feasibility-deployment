import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Log full error server-side for debugging
  console.error("Unhandled error:", err);

  // In production, never expose internal error details to the client
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message || "Internal server error";

  res.status(500).json({ message });
}
