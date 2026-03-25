import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRepository } from "./user.repository.js";
import type { AuthPayload, UserRole } from "../../shared/types/index.js";
import { AppError } from "../../shared/errors/AppError.js";
import { logger } from "../../shared/logger.js";

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
      roles: user.roles,
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

  /** Seed default department users if they don't already exist. */
  async seedDefaultUser(): Promise<void> {
    const seedUsers: { username: string; password: string; roles: string }[] = [
      { username: "admin", password: "Password@1234", roles: "admin" },
      { username: "commercial", password: "Password@1234", roles: "commercial" },
      { username: "sales", password: "Password@1234", roles: "sales" },
      { username: "finance", password: "Password@1234", roles: "finance" },
      { username: "collections", password: "Password@1234", roles: "collections" },
      { username: "marketing", password: "Password@1234", roles: "marketing" },
      { username: "business_development", password: "Password@1234", roles: "business_development" },
      { username: "cfo", password: "Password@1234", roles: "cfo" },
    ];

    for (const seed of seedUsers) {
      const existing = await this.userRepo.findByUsername(seed.username);
      if (existing) continue;

      this.validatePassword(seed.password);
      const hash = await bcrypt.hash(seed.password, BCRYPT_ROUNDS);
      await this.userRepo.create(seed.username, hash, seed.roles);
      logger.info({ username: seed.username, roles: seed.roles }, "Seeded user");
    }
  }

  async listUsers(): Promise<Omit<import("../../shared/types/index.js").AppUser, "passwordHash">[]> {
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

  async deleteUser(userId: number): Promise<void> {
    const deleted = await this.userRepo.deleteById(userId);
    if (!deleted) {
      throw new AppError("User not found", 404);
    }
  }

  async register(username: string, password: string, roles: string): Promise<AuthPayload> {
    this.validatePassword(password);
    const existing = await this.userRepo.findByUsername(username);
    if (existing) {
      throw new AppError("Registration failed", 409);
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.userRepo.create(username, hash, roles);

    return { userId: user.id, username: user.username, roles: user.roles };
  }

  async updateUserRoles(userId: number, roles: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    await this.userRepo.updateRoles(userId, roles);
  }
}
