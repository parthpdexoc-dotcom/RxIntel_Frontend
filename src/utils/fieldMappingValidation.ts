type RequiredValidationOptions<T> = {
  getDestination: (row: T) => string;
  getMappedSource: (row: T) => string;
  isRequired: (destination: string) => boolean;
};

export function findFirstMissingRequiredDestination<T>(
  rows: T[],
  options: RequiredValidationOptions<T>
): string | null {
  for (const row of rows) {
    const destination = options.getDestination(row).trim();
    if (!destination) continue;
    if (!options.isRequired(destination)) continue;

    const mappedSource = options.getMappedSource(row).trim();
    if (!mappedSource) return destination;
  }
  return null;
}

export function buildRequiredFieldErrorMessage(
  destination: string,
  formatLabel: (value: string) => string
) {
  return `${formatLabel(destination)} is required`;
}
