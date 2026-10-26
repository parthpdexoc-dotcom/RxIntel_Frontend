import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getPharmacyByIdApi } from "../service/PharmacyService";
import { getPharmacyDisplayName } from "../dto/pharmacyDto";
import type { PharmacyDto } from "../dto/pharmacyDto";
import type { RootState } from "../app/store";

export function usePharmacyDisplayName(
  pharmacyId: string,
  initialName = ""
): string {
  const pharmacyFromList = useSelector((state: RootState) =>
    state.pharmacy.list.find((item) => String(item.id) === String(pharmacyId))
  );
  const cachedName = getPharmacyDisplayName(pharmacyFromList);
  const [fetchedName, setFetchedName] = useState("");

  useEffect(() => {
    setFetchedName("");
  }, [pharmacyId]);

  useEffect(() => {
    if (!pharmacyId || cachedName || initialName.trim()) return;

    let cancelled = false;

    getPharmacyByIdApi(pharmacyId)
      .then((res) => {
        if (!cancelled) {
          setFetchedName(getPharmacyDisplayName(res.data as PharmacyDto));
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedName("");
      });

    return () => {
      cancelled = true;
    };
  }, [pharmacyId, cachedName, initialName]);

  return cachedName || initialName.trim() || fetchedName;
}
