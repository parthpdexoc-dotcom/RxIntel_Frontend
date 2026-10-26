import React, { useState } from "react";
import {
  IconButton,
  InputAdornment,
  TextField,
  type TextFieldProps,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { rxBrand } from "../../theme/rxBrand";

type AuthFieldType = "text" | "email" | "password";

type AuthTextFieldProps = Omit<TextFieldProps, "type" | "variant"> & {
  name: string;
  label: string;
  type?: AuthFieldType;
  /** Leading icon shown inside the field (MUI startAdornment) */
  startIcon?: React.ReactNode;
  /** @deprecated use startIcon — kept for older call sites */
  icon?: React.ReactNode;
  iconClassName?: string;
  fieldClassName?: string;
  readOnly?: boolean;
};

/**
 * Shared auth TextField — white field, green start icon, grey eye for password.
 * Prefer this over custom CSS chips so the same control works app-wide.
 */
function AuthTextField({
  startIcon,
  icon,
  iconClassName: _iconClassName,
  fieldClassName = "login-field",
  name,
  label,
  type = "text",
  value,
  defaultValue,
  required = false,
  error = false,
  helperText,
  readOnly = false,
  slotProps,
  sx,
  ...rest
}: AuthTextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const inputType = isPasswordField
    ? showPassword
      ? "text"
      : "password"
    : type;

  const plainLabel = String(label).replace(/\*/g, "").trim().toLowerCase();
  const leadingIcon = startIcon ?? icon;

  const startAdornment = leadingIcon ? (
    <InputAdornment
      position="start"
      sx={{
        color: rxBrand.iconGreen,
        marginRight: "12px !important",
        marginLeft: "2px",
      }}
    >
      {leadingIcon}
    </InputAdornment>
  ) : undefined;

  const endAdornment = isPasswordField ? (
    <InputAdornment position="end">
      <IconButton
        size="small"
        edge="end"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={`toggle ${plainLabel} visibility`}
        sx={{ color: rxBrand.eyeGrey }}
      >
        {showPassword ? (
          <VisibilityOffOutlinedIcon fontSize="small" />
        ) : (
          <VisibilityOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </InputAdornment>
  ) : undefined;

  return (
    <TextField
      className={fieldClassName}
      fullWidth
      size="small"
      variant="outlined"
      type={inputType}
      name={name}
      label={label}
      value={value}
      defaultValue={defaultValue}
      required={required}
      error={error}
      helperText={helperText}
      sx={{
        mb: 0.5,
        "& .MuiOutlinedInput-root": {
          backgroundColor: `${rxBrand.fieldBg} !important`,
          borderRadius: "12px",
          minHeight: 44,
          paddingLeft: "10px",
          gap: "4px",
        },
        "& .MuiOutlinedInput-input": {
          paddingLeft: "4px !important",
        },
        "& .MuiInputAdornment-positionStart": {
          marginRight: "10px !important",
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: rxBrand.border,
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: rxBrand.green,
        },
        "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: `${rxBrand.teal} !important`,
        },
        "& .MuiInputLabel-root": {
          color: rxBrand.muted,
        },
        "& .MuiInputLabel-root.Mui-focused": {
          color: rxBrand.teal,
        },
        "& .MuiFormHelperText-root": {
          minHeight: 16,
          mx: 0.5,
          mt: 0.25,
        },
        ...sx,
      }}
      slotProps={{
        ...slotProps,
        inputLabel: { shrink: true, ...(slotProps as any)?.inputLabel },
        input: {
          ...(slotProps as any)?.input,
          readOnly,
          startAdornment,
          endAdornment,
          sx: {
            backgroundColor: rxBrand.fieldBg,
            "& input": {
              backgroundColor: "transparent",
              color: rxBrand.navy,
              paddingLeft: "4px",
            },
            "& input:-webkit-autofill": {
              WebkitBoxShadow: `0 0 0 1000px ${rxBrand.fieldBg} inset`,
              WebkitTextFillColor: rxBrand.navy,
            },
            ...(slotProps as any)?.input?.sx,
          },
        },
      }}
      {...rest}
    />
  );
}

export default AuthTextField;
