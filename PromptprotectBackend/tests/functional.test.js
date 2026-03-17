const { clearDatabase } = require("./db.helpers");

describe("Streamlined Functional Flow", () => {
    jest.setTimeout(60000);
    let authCookies;

    beforeAll(async () => {
        await clearDatabase();
    });

    test("Full Flow: Signup -> Verify -> Login -> Functional Tests", async () => {
        const app = require("../server");
        const User = require("../models/user.model");
        const request = require("supertest");

        // 1. Signup
        console.log("STEP 1: Starting Signup...");
        const signupRes = await request(app)
            .post("/api/org/signup")
            .send({
                userName: "Admin User",
                userEmail: "admin@test.com",
                userPassword: "Password123!",
                orgName: "Functional Test Org",
                workspace: "func_test_ws",
                timezone: "UTC"
            });

        expect(signupRes.status).toBe(201);
        expect(signupRes.body.success).toBe(true);
        const userId = signupRes.body.user._id;
        console.log("STEP 1: Signup Successful. User ID:", userId);

        // 2. Verify Email
        console.log("STEP 2: Starting Email Verification...");
        const userInDb = await User.findById(userId);
        const verificationToken = userInDb.verificationToken;
        expect(verificationToken).toBeDefined();

        const verifyRes = await request(app)
            .get(`/api/users/auth/verify-email?token=${verificationToken}`);

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.success).toBe(true);
        console.log("STEP 2: Email Verification Successful.");

        // 3. Login
        console.log("STEP 3: Starting Login...");
        const loginRes = await request(app)
            .post("/api/users/auth/login")
            .send({
                userEmail: "admin@test.com",
                userPassword: "Password123!"
            });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.success).toBe(true);
        authCookies = loginRes.headers['set-cookie'];
        expect(authCookies).toBeDefined();
        console.log("STEP 3: Login Successful. Cookies captured.");

        // 4. User Management: POST (Create User)
        console.log("STEP 4: Creating additional user...");
        const createUserRes = await request(app)
            .post("/api/users")
            .set("Cookie", authCookies)
            .send({
                userName: "Additional User",
                userEmail: "additional@test.com",
                userPassword: "Password123!",
                userRole: ["USER"]
            });
        expect([200, 201]).toContain(createUserRes.status);
        console.log("STEP 4: Additional User created.");

        // 5. User Management: GET
        console.log("STEP 5: Fetching users list...");
        const getUsersRes = await request(app)
            .get("/api/users")
            .set("Cookie", authCookies);

        expect(getUsersRes.status).toBe(200);
        expect(getUsersRes.body.success).toBe(true);
        expect(getUsersRes.body.data.length).toBeGreaterThanOrEqual(2); // Admin + New User
        console.log("STEP 5: Users list fetched. Total users:", getUsersRes.body.data.length);

        // 6. Policy Management: POST (Create Policy)
        console.log("STEP 6: Creating security policy...");
        const createPolicyRes = await request(app)
            .post("/api/policies")
            .set("Cookie", authCookies)
            .send({
                policyName: "Test Security Policy",
                rulesForPolicy: ["PII"],
                action: "BLOCK"
            });
        expect([200, 201]).toContain(createPolicyRes.status);
        const policyId = createPolicyRes.body.policy._id;
        console.log("STEP 6: Security Policy created. Policy ID:", policyId);

        // 7. Policy Management: GET
        console.log("STEP 7: Fetching policies list...");
        const getPoliciesRes = await request(app)
            .get("/api/policies")
            .set("Cookie", authCookies);

        expect(getPoliciesRes.status).toBe(200);
        expect(getPoliciesRes.body.success).toBe(true);
        expect(getPoliciesRes.body.policies.length).toBeGreaterThanOrEqual(1);
        console.log("STEP 7: Policies list fetched. Total policies:", getPoliciesRes.body.policies.length);

        // 8. Group Management: POST (Create Group)
        console.log("STEP 8: Creating engineering group...");
        const createGroupRes = await request(app)
            .post("/api/groups")
            .set("Cookie", authCookies)
            .send({
                groupName: "Test Engineering Group",
                groupUsers: [userId],
                policiesAttached: [policyId]
            });
        expect([200, 201]).toContain(createGroupRes.status);
        console.log("STEP 8: Engineering Group created.");

        // 9. Group Management: GET
        console.log("STEP 9: Fetching groups list...");
        const getGroupsRes = await request(app)
            .get("/api/groups")
            .set("Cookie", authCookies);

        expect(getGroupsRes.status).toBe(200);
        expect(getGroupsRes.body.success).toBe(true);
        expect(getGroupsRes.body.groups.length).toBeGreaterThanOrEqual(1);
        console.log("STEP 9: Groups list fetched. Flow Complete ✅");
    });
});
