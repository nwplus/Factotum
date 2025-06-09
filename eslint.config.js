import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    // Ignore folder with old commands
    // TODO: Remove this once the old commands are removed
    ignores: ["commands/**/*"],
  },
);
