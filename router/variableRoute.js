const express = require("express");
const router = express.Router();

const variableController = require("../controllers/variableController");

router.post("/create", variableController.createVariables);
router.get("/get", variableController.getVariables);

module.exports = router;
