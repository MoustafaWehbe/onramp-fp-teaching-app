jest.mock("@starter-kit/shared/auth", () => ({
  ...jest.requireActual("@starter-kit/shared/auth"),
  hashPassword: jest.fn(async () => "hashed-password"),
}));

import { User } from "@starter-kit/shared/db/models/User";
import { AuthService } from "../../src/services/auth.service";

describe("public registration role enforcement", () => {
  afterEach(() => jest.restoreAllMocks());

  it("creates a student even when a JavaScript caller supplies instructor", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);
    const create = jest.spyOn(User, "create").mockResolvedValue({
      id: "student-1",
      email: "student@example.com",
      name: "Student",
      role: "student",
    } as User);
    const service = new AuthService();

    const result = await service.register({
      email: "student@example.com",
      password: "SecurePass1",
      name: "Student",
      role: "instructor",
    } as Parameters<AuthService["register"]>[0] & { role: "instructor" });

    expect(create).toHaveBeenCalledWith({
      email: "student@example.com",
      passwordHash: "hashed-password",
      name: "Student",
      role: "student",
    });
    expect(result.role).toBe("student");
  });
});
