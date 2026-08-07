import { Router } from "express";
import { moduleController } from "../controllers/module.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router({ mergeParams: true });

router.get("/", authenticate, moduleController.getModules);
router.post("/", authenticate, authorize("instructor"), moduleController.createModule);
router.get("/:id", authenticate, moduleController.getModule);
router.put("/:id", authenticate, authorize("instructor"), moduleController.updateModule);
router.delete("/:id", authenticate, authorize("instructor"), moduleController.deleteModule);

export { router as moduleRouter };
