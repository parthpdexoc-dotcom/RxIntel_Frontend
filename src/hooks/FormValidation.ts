import { useCallback, useState } from "react";
import { buildRequiredFieldMessage } from "../utils/formFieldLabels";

type Values = Record<string, any>;

type Rule = {
  required?: boolean;
  message?: string;
  /** Runs when field has a value (and on save for required). Return error text or null. */
  validate?: (value: unknown) => string | null;
};

type Rules = Record<string, Rule>;

type Errors = Record<string, string>;

export function evaluateFormRules(data: Values, rules: Rules = {}): Errors {
  const newErrors: Errors = {};

  Object.keys(rules).forEach((field) => {
    const rule = rules[field];
    const value = data[field as keyof Values];

    if (rule?.required && !value) {
      newErrors[field] = rule.message || buildRequiredFieldMessage(field);
      return;
    }

    if (rule?.validate) {
      const customError = rule.validate(value);
      if (customError) {
        newErrors[field] = customError;
      }
    }
  });

  return newErrors;
}

export default function useFormValidation<T extends Values>(
  initialValues: T,
  rules: Rules = {}
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Errors>({});

  // 🔹 Update field value
  const handleChange = (name: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // remove error when user types
    setErrors((prev) => ({
      ...prev,
      [name as string]: "",
    }));
  };

  // 🔹 Validate all fields
  const validate = (data: T = values) => {
    const newErrors = evaluateFormRules(data, rules);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (field: string, value: unknown) => {
    const rule = rules[field];
    if (!rule?.validate) {
      setFieldErrors({ [field]: "" });
      return true;
    }

    const error = rule.validate(value);
    setFieldErrors({ [field]: error ?? "" });
    return !error;
  };

  // 🔹 Reset form
  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  // 🔹 Set values manually (edit mode ke liye useful)
  const setFormValues = (data: T) => {
    setValues(data);
  };

  const setFieldErrors = useCallback((fieldErrors: Errors) => {
    setErrors((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(fieldErrors)) {
        if (!value) delete next[key];
        else next[key] = value;
      }
      return next;
    });
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  const clearFieldErrorOnChange = useCallback(
    (fieldName: string, onCleared?: () => void) => {
      setErrors((prev) => {
        if (!prev[fieldName]) return prev;
        const next = { ...prev };
        delete next[fieldName];
        onCleared?.();
        return next;
      });
    },
    []
  );

  return {
    values,
    errors,
    handleChange,
    validate,
    validateField,
    reset,
    setValues: setFormValues,
    setFieldErrors,
    clearErrors,
    clearFieldErrorOnChange,
  };
}