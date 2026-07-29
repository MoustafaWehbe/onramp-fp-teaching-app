import { Router } from "express";
import { milestoneController } from "../controllers/milestone.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router({ mergeParams: true });

router.get("/", authenticate, milestoneController.getMilestones);
router.post("/", authenticate, authorize("instructor"), milestoneController.createMilestone);
router.get("/:id", authenticate, milestoneController.getMilestone);
router.put("/:id", authenticate, authorize("instructor"), milestoneController.updateMilestone);
router.delete("/:id", authenticate, authorize("instructor"), milestoneController.deleteMilestone);

export { router as milestoneRouter };
