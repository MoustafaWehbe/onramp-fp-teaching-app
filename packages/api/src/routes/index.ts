import { Router } from "express";
import { authRouter } from "./auth.routes";

const router = Router();

router.use("/auth", authRouter);

// Add more routers here:
// router.use('/users', usersRouter);

export { router };
