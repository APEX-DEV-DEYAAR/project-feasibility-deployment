import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRepository } from "../repositories/user.repository.js";
import type { AuthPayload, UserRole } from "../types/index.js";
import { AppError } from "../errors/AppError.js";

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtSecret: string
  ) {}

  async login(username: string, password: string): Promise<{ token: string; user: AuthPayload }> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new AppError("Invalid username or password", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid username or password", 401);
    }

    const payload: AuthPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: "30m" });

    return { token, user: payload };
  }

  verifyToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as AuthPayload;
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }
  }

  /** Seed a default admin user if the users table is empty. */
  async seedDefaultUser(): Promise<void> {
    const count = await this.userRepo.count();
    if (count > 0) return;

    const generatedPassword = randomBytes(16).toString("hex");
    const hash = await bcrypt.hash(generatedPassword, BCRYPT_ROUNDS);
    await this.userRepo.create("admin", hash, "admin");
    console.log("  Seeded default admin user. Username: admin");
    console.log(`  Generated password: ${generatedPassword}`);
    console.log("  IMPORTANT: Change this password immediately via the admin UI.");
  }

  async listUsers(): Promise<Omit<import("../types/index.js").AppUser, "passwordHash">[]> {
    return this.userRepo.listAll();
  }

  private validatePassword(password: string): void {
    if (password.length < 12) {
      throw new AppError("Password must be at least 12 characters", 400);
    }
    if (!/[A-Z]/.test(password)) {
      throw new AppError("Password must include at least one uppercase letter", 400);
    }
    if (!/[a-z]/.test(password)) {
      throw new AppError("Password must include at least one lowercase letter", 400);
    }
    if (!/[0-9]/.test(password)) {
      throw new AppError("Password must include at least one digit", 400);
    }
  }

  async changePassword(userId: number, newPassword: string): Promise<void> {
    this.validatePassword(newPassword);
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepo.updatePassword(userId, hash);
  }

  async register(username: string, password: string, role: UserRole): Promise<AuthPayload> {
    this.validatePassword(password);
    const existing = await this.userRepo.findByUsername(username);
    if (existing) {
      throw new AppError("Username already exists", 409);
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.userRepo.create(username, hash, role);

    return { userId: user.id, username: user.username, role: user.role };
  }
}
