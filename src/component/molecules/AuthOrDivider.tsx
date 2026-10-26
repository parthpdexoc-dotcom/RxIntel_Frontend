import React from "react";
import { Divider, Stack, Typography } from "@mui/material";
import { rxBrand } from "../../theme/rxBrand";

type AuthOrDividerProps = {
  label?: string;
};

/** Shared OR divider for login / register auth flows */
export default function AuthOrDivider({ label = "OR" }: AuthOrDividerProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ width: "100%", my: 1.75, alignItems: "center" }}
      role="separator"
      aria-label={label}
    >
      <Divider sx={{ flex: 1, borderColor: rxBrand.border }} />
      <Typography
        variant="caption"
        sx={{
          color: rxBrand.muted,
          fontWeight: 600,
          letterSpacing: "0.08em",
          px: 0.5,
        }}
      >
        {label}
      </Typography>
      <Divider sx={{ flex: 1, borderColor: rxBrand.border }} />
    </Stack>
  );
}
