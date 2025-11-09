import { z } from "zod";

export const USER_ID_REGEX = /^[a-z0-9_]{3,15}$/;

export const userIdSchema = z
  .string()
  .min(3)
  .max(15)
  .regex(USER_ID_REGEX, {
    message:
      "Usernames can have letters, digits, and underscores, and must be 3–15 characters long.",
  });


