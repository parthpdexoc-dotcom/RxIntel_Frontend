import { get } from "../utils/CommonApi";
import type { StateDto } from "../dto/stateDto";

export const getStatesApi = () => get("/State");
