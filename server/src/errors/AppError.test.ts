import { describe, it, expect } from "vitest";
import { AppError, NotFoundError, ValidationError } from "./AppError.js";

describe("AppError", () => {
  it("defaults to status 500", () => {
    const err = new AppError("something broke");
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe("something broke");
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("accepts a custom status code", () => {
    const err = new AppError("conflict", 409);
    expect(err.statusCode).toBe(409);
  });
});

describe("NotFoundError", () => {
  it("has status 404 and default message", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Resource not found");
  });

  it("accepts a custom message", () => {
    const err = new NotFoundError("Project not found");
    expect(err.message).toBe("Project not found");
    expect(err.statusCode).toBe(404);
  });
});

describe("ValidationError", () => {
  it("has status 400 and default message", () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Validation failed");
  });

  it("accepts a custom message", () => {
    const err = new ValidationError("Name is required");
    expect(err.message).toBe("Name is required");
  });
});
