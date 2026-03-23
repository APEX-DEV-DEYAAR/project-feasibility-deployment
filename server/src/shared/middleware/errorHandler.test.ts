import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "./errorHandler.js";
import { AppError, NotFoundError, ValidationError } from "../errors/AppError.js";
import type { Request, Response, NextFunction } from "express";

function mockRes() {
  const res = {
    statusCode: 200,
    _json: null as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(data: unknown) { this._json = data; return this; },
  };
  return res as unknown as Response & { statusCode: number; _json: unknown };
}

describe("errorHandler", () => {
  const req = { method: "GET", originalUrl: "/test" } as Request;
  const next = vi.fn() as NextFunction;

  it("returns 404 for NotFoundError", () => {
    const res = mockRes();
    errorHandler(new NotFoundError("Project not found"), req, res, next);
    expect(res.statusCode).toBe(404);
    expect((res._json as any).message).toBe("Project not found");
  });

  it("returns 400 for ValidationError", () => {
    const res = mockRes();
    errorHandler(new ValidationError("Name is required"), req, res, next);
    expect(res.statusCode).toBe(400);
    expect((res._json as any).message).toBe("Name is required");
  });

  it("returns custom status for AppError", () => {
    const res = mockRes();
    errorHandler(new AppError("conflict", 409), req, res, next);
    expect(res.statusCode).toBe(409);
  });

  it("returns 500 for unknown errors", () => {
    const res = mockRes();
    errorHandler(new Error("unexpected"), req, res, next);
    expect(res.statusCode).toBe(500);
  });
});
