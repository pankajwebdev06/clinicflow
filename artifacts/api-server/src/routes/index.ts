import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clinicRouter from "./clinic";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clinicRouter);

export default router;
