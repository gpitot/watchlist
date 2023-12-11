import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import watchlist from "./watchlist";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/watchlist", watchlist);

export default router;
