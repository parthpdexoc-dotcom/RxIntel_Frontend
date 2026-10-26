import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getPharmacySoftwareByIdApi } from "../service/PharmacySoftwareService";
import {
  getPharmacySoftwareDisplayName,
  type PharmacySoftwareDto,
} from "../dto/pharmacySoftwareDto";
import type { RootState } from "../app/store";

export function usePharmacySoftwareDisplayName(
  pharmacySoftwareId: string,
  initialName = ""
): string {
  const softwareFromList = useSelector((state: RootState) =>
    state.pharmacysoftware.list.find(
      (item) => String(item.id) === String(pharmacySoftwareId)
    )
  );
  const cachedName = getPharmacySoftwareDisplayName(softwareFromList);
  const [fetchedName, setFetchedName] = useState("");

  useEffect(() => {
    setFetchedName("");
  }, [pharmacySoftwareId]);

  useEffect(() => {
    if (!pharmacySoftwareId || cachedName || initialName.trim()) return;

    let cancelled = false;

    getPharmacySoftwareByIdApi(pharmacySoftwareId)
      .then((res) => {
        if (!cancelled) {
          setFetchedName(
            getPharmacySoftwareDisplayName(res.data as PharmacySoftwareDto)
          );
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedName("");
      });

    return () => {
      cancelled = true;
    };
  }, [pharmacySoftwareId, cachedName, initialName]);

  return cachedName || initialName.trim() || fetchedName;
}
