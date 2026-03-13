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

  /** Seed default department users if they don't already exist. */
  async seedDefaultUser(): Promise<void> {
    const seedUsers: { username: string; password: string; role: UserRole }[] = [
      { username: "admin", password: "Admin@123456", role: "admin" },
      { username: "commercial", password: "Commercial@123", role: "commercial" },
      { username: "sales", password: "Sales@123456", role: "sales" },
      { username: "finance", password: "Finance@1234", role: "finance" },
      { username: "collections", password: "Collections@123", role: "collections" },
      { username: "marketing", password: "Marketing@123", role: "marketing" },
      { username: "cfo", password: "Cfo@123456789", role: "cfo" },
    ];

    for (const seed of seedUsers) {
      const existing = await this.userRepo.findByUsername(seed.username);
      if (existing) continue;

      const hash = await bcrypt.hash(seed.password, BCRYPT_ROUNDS);
      await this.userRepo.create(seed.username, hash, seed.role);
      console.log(`  Seeded user: ${seed.username} (${seed.role})`);
    }
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
