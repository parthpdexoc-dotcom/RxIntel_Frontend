import { get, put } from "../utils/CommonApi";
import type {
  TermsAndConditionsDto,
  TermsAndConditionsUpdateDto,
} from "../dto/termsDto";
import { messageFromApiBody } from "../slice/mappingThunkUtils";

export async function fetchCurrentTermsApi(): Promise<TermsAndConditionsDto | null> {
  try {
    const response = await get("/Terms/current");
    return response.data as TermsAndConditionsDto;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function saveCurrentTermsApi(
  dto: TermsAndConditionsUpdateDto
): Promise<{ ok: true; data: TermsAndConditionsDto } | { ok: false; message: string }> {
  try {
    const response = await put("/Terms/current", dto);
    const body = response.data as {
      status?: number;
      message?: string;
      data?: TermsAndConditionsDto;
    };
    if (body.status != null && body.status !== 200) {
      return {
        ok: false,
        message: body.message ?? messageFromApiBody(body) ?? "Save failed",
      };
    }
    if (body.data) {
      return { ok: true, data: body.data };
    }
    return { ok: true, data: response.data as TermsAndConditionsDto };
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number } };
    const message =
      messageFromApiBody(err.response?.data) ??
      (err.response?.status === 403
        ? "You are not authorized to update Terms and Conditions."
        : "Save failed");
    return { ok: false, message };
  }
}
