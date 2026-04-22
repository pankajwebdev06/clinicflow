import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clinicRouter from "./clinic";
import doctorRouter from "./doctor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clinicRouter);
router.use(doctorRouter);

export default router;
