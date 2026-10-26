import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { rxBrand } from "../../theme/rxBrand";

type AuthInfoBoxProps = {
  children?: React.ReactNode;
};

/** Shared info strip used on login / register cards */
export default function AuthInfoBox({ children }: AuthInfoBoxProps) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        mt: 1,
        p: 1.5,
        borderRadius: "14px",
        backgroundColor: rxBrand.infoBoxBg,
        border: `1px solid ${rxBrand.border}`,
        alignItems: "flex-start",
      }}
    >
      <VerifiedUserOutlinedIcon
        sx={{ color: rxBrand.iconGreen, fontSize: 22, mt: "1px", flexShrink: 0 }}
      />
      <Typography
        variant="body2"
        sx={{
          color: rxBrand.muted,
          fontSize: "0.8rem",
          lineHeight: 1.45,
          textAlign: "left",
        }}
      >
        {children ?? (
          <>
            RxIntel brings together clinical, commercial, and operational data so
            your teams can act on evidence with{" "}
            <Box component="span" sx={{ color: rxBrand.teal, fontWeight: 600 }}>
              confidence
            </Box>
            .
          </>
        )}
      </Typography>
    </Stack>
  );
}
