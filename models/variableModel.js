const mongoose = require("mongoose");

const variableTypeSchema = new mongoose.Schema({
  varType: { type: String, required: true },
});

const variableSchema = new mongoose.Schema(
  {
    variableId: {
      type: String,
      unique: true,
      required: true,
    },
    variableName: {
      type: String,
      required: true,
      unique: true,
    },
    variableType: [variableTypeSchema],
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Variables", variableSchema);
