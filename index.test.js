const supertest = require("supertest");
const app = require("./index");

describe("User Management", () => {
  let token;
  let createdUserId;
  beforeEach(async () => {
    const response = await supertest(app)
      .post("/login")
      .send({ username: "admin", password: "password" });

    if (response.body && response.body.accessToken) {
      console.log("Login response:", response.body);
      token = response.body.accessToken;
    } else {
      console.error("Invalid login response:", response.body);
    }
  });

  describe("POST /register", () => {
    it("should create a new user", async () => {
      if (!token) {
        console.error("No valid token available.");
        return;
      }

      const response = await supertest(app).post("/register").set("Authorization", token).send({
        username: "newuser",
        password: "newpassword",
        role: "passenger",
        email: "newuser@test.com",
      });

      expect(response.status).toBe(201);
      expect(response.body.username).toBe("newuser");
      expect(response.body.role).toBe("passenger");

      createdUserId = response.body._id;
      console.log("Created User ID:", createdUserId);
    });

    it("should handle duplicate username or email", async () => {
      if (!token) {
        console.error("No valid token available.");
        return;
      }

      const response = await supertest(app).post("/register").set("Authorization", token).send({
        username: "newuser",
        password: "newpassword",
        role: "passenger",
        email: "newuser@test.com",
      });

      expect(response.status).toBe(400);
    });

    it("should handle invalid role", async () => {
      if (!token) {
        console.error("No valid token available.");
        return;
      }
      const response = await supertest(app).post("/register").set("Authorization", token).send({
        username: "invaliduser",
        password: "newpassword",
        role: "invalidrole",
        email: "invaliduser@test.com",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /users/:id", () => {
    it("should get user details by ID", async () => {
      const response = await supertest(app)
        .get(`/users/${createdUserId}`)
        .set("Authorization", token);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("username");
      expect(response.body).toHaveProperty("role");
    });

    it("should handle invalid user ID", async () => {
      const response = await supertest(app)
        .get("/users/656440526af111cbf8e8bc54")
        .set("Authorization", token);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /users/:id", () => {
    it("should update the user details", async () => {
      if (!token || !createdUserId) {
        console.error("No valid token or user ID available.");
        return;
      }

      const updatedUserData = {
        username: "updateduser",
        role: "admin",
      };

      const response = await supertest(app)
        .put(`/users/${createdUserId}`)
        .set("Authorization", token)
        .send(updatedUserData);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(updatedUserData.username);
      expect(response.body.role).toBe(updatedUserData.role);
    });

    it("should handle updating a non-existent user", async () => {
      if (!token) {
        console.error("No valid token available.");
        return;
      }

      const updatedUserData = {
        username: "updateduser",
        role: "admin",
      };

      const response = await supertest(app)
        .put(`/users/656440526af111cbf8e8bc54`)
        .set("Authorization", token)
        .send(updatedUserData);

      expect(response.status).toBe(404);
    });

    it("should handle invalid data for updating user", async () => {
      if (!token || !createdUserId) {
        console.error("No valid token or user ID available.");
        return;
      }

      const invalidUserData = {
        meal: "vegetarian",
      };

      const response = await supertest(app)
        .put(`/users/${createdUserId}`)
        .set("Authorization", token)
        .send(invalidUserData);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty("meal");
    });
  });

  describe("DELETE /users/:id", () => {
    it("should delete the newly created user", async () => {
      if (!token || !createdUserId) {
        console.error("No valid token or user ID available.");
        return;
      }

      const response = await supertest(app)
        .delete(`/users/${createdUserId}`)
        .set("Authorization", token);

      expect(response.status).toBe(204);
    });
  });
});
