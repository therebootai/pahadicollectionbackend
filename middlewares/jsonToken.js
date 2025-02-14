const jwt = require("jsonwebtoken");
exports.generateToken = (payload) => {
  try {
    if (!process.env.SECRET_KEY) throw new Error("SECRET_KEY is missing");

    // Sign the token with the payload and secret key, set expiration
    return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "30d" });
  } catch (err) {
    console.error(
      "Token generation error:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
};

exports.authenticateUser = (req, res, next) => {
  const token = req.cookies?.token; // Get token from cookies

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  if (!process.env.SECRET_KEY) throw new Error("SECRET_KEY is missing");
  // Verify the token and decode it
  const decoded = jwt.verify(token, process.env.SECRET_KEY);

  if (!decoded) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid or expired token" });
  }

  req.user = decoded; // Attach user data to request
  next(); // Move to the next middleware or route handler
};
