const express = require("express");
const router = express.Router();

const variableController = require("../controllers/variableController");

router.post("/create", variableController.createVariables);
router.get("/get", variableController.getVariables);
router.put("/update/:variableId", variableController.updateVariable);
router.delete("/delete/:variableId", variableController.deleteVariable);

module.exports = router;
