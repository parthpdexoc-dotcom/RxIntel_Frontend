import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { saveAdminProfile } from "../../slice/AdminProfileSlice";
import { addPharmacyUser } from "../../slice/PharmacyUserSlice";
import {
  getStoredAuth,
  isEmployee,
  mergeStoredAuth,
  type StoredAuth,
} from "../../component/auth/authUtils";
import { getPharmacyUserByIdApi, uploadPharmacyUserProfileImageApi } from "../../service/PharmacyUserService";
import { getAdminApi, uploadAdminProfileImageApi } from "../../service/AdminProfileService";
import { showError } from "../../component/atoms/ToastHelper";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import { sanitizePhoneInput } from "../../utils/pharmacyValidation";
import {
  resolveAdminProfileImageSrc,
  resolvePharmacyUserProfileImageSrc,
} from "../../utils/pharmacyUserProfileImage";
import type { PharmacyUserDto } from "../../dto/pharmacyUserDto";
import type { PharmacyUserRole } from "../../enums/PharmacyUserRole";
import "./EditProfile.css";
import {
  FaBriefcase,
  FaEnvelope,
  FaPhone,
  FaSave,
  FaUser,
  FaUserCircle,
} from "react-icons/fa";

type AdminProfileForm = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type PharmacyProfileForm = {
  id: string;
  pharmacyId: string;
  name: string;
  email: string;
  primaryContactName: string;
  primaryContactTitle: string;
  primaryContactPhone: string;
};

type PharmacyMeta = {
  role?: PharmacyUserRole;
  isActive: boolean;
};

type FormChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

const BACK_BUTTON_SX = {
  border: "1px solid",
  borderColor: "grey.300",
  borderRadius: "8px",
  width: 36,
  height: 36,
  color: "text.primary",
  bgcolor: "background.paper",
  "&:hover": {
    bgcolor: "grey.50",
    border: "1px solid #000",
  },
} as const;

const EMPTY_ADMIN_FORM: AdminProfileForm = {
  id: "",
  name: "",
  email: "",
  role: "",
};

const EMPTY_PHARMACY_FORM: PharmacyProfileForm = {
  id: "",
  pharmacyId: "",
  name: "",
  email: "",
  primaryContactName: "",
  primaryContactTitle: "",
  primaryContactPhone: "",
};

function applyAuthToAdminForm(auth: StoredAuth): AdminProfileForm {
  return {
    id: auth.id ?? "",
    name: auth.name ?? "",
    email: auth.email ?? "",
    role: auth.role != null ? String(auth.role) : "",
  };
}

function applyPharmacyUserToForm(user: PharmacyUserDto): PharmacyProfileForm {
  return {
    id: user.id ?? "",
    pharmacyId: user.pharmacyId ?? "",
    name: user.name ?? "",
    email: user.userEmail ?? "",
    primaryContactName: user.primaryContactName ?? "",
    primaryContactTitle: user.primaryContactTitle ?? "",
    primaryContactPhone: user.primaryContactPhone ?? "",
  };
}

function toPharmacyAuthPatch(
  user: PharmacyUserDto,
  fallback?: Partial<StoredAuth> & { email?: string | null }
): Partial<StoredAuth> {
  return {
    id: user.id ?? fallback?.id,
    pharmacyId: user.pharmacyId ?? fallback?.pharmacyId,
    name: user.name ?? fallback?.name,
    email: user.userEmail ?? fallback?.email,
    role:
      user.role != null
        ? String(user.role)
        : fallback?.role != null
          ? String(fallback.role)
          : undefined,
    isActive: user.isActive ?? fallback?.isActive,
    primaryContactName: user.primaryContactName ?? fallback?.primaryContactName,
    primaryContactTitle: user.primaryContactTitle ?? fallback?.primaryContactTitle,
    primaryContactPhone: user.primaryContactPhone ?? fallback?.primaryContactPhone,
    profileImage: user.profileImage ?? fallback?.profileImage,
  };
}

function validatePharmacyForm(form: PharmacyProfileForm): string | null {
  if (!form.primaryContactName?.trim()) return "Please enter contact name";
  if (!form.primaryContactPhone?.trim()) return "Please enter contact phone";
  if (!form.pharmacyId) return "Pharmacy id is missing. Please log in again.";
  if (!form.id) return "User id is missing. Please log in again.";
  return null;
}

function buildPharmacyPayload(
  form: PharmacyProfileForm,
  meta: PharmacyMeta,
  profileImage: string | null
) {
  return {
    id: form.id,
    pharmacyId: form.pharmacyId,
    name: form.name?.trim() || null,
    userEmail: form.email?.trim() || null,
    role: meta.role,
    isActive: meta.isActive,
    primaryContactName: form.primaryContactName.trim(),
    primaryContactTitle: form.primaryContactTitle?.trim() || null,
    primaryContactPhone: form.primaryContactPhone.trim(),
    profileImage: profileImage?.trim() || null,
  };
}

function extractUploadedProfileImageFileName(responseData: unknown): string {
  const body = responseData as { data?: unknown };
  const fileName = body?.data;
  if (typeof fileName !== "string" || !fileName.trim()) {
    throw new Error("Upload did not return a profile image filename");
  }
  return fileName.trim();
}

async function uploadPharmacyProfileImage(
  file: File,
  userId?: string
): Promise<string> {
  const response = await uploadPharmacyUserProfileImageApi(file, userId);
  return extractUploadedProfileImageFileName(response.data);
}

async function uploadAdminProfileImage(
  file: File,
  userId?: string
): Promise<string> {
  const response = await uploadAdminProfileImageApi(file, userId);
  return extractUploadedProfileImageFileName(response.data);
}

async function loadPharmacyUserProfile(userId: string): Promise<PharmacyUserDto> {
  const response = await getPharmacyUserByIdApi(userId);
  const user = (response.data?.data ?? response.data) as PharmacyUserDto;
  if (!user?.id) throw new Error("Profile not found");
  return user;
}

type AdminProfileDto = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  profileImage?: string | null;
};

async function loadAdminProfile(userId: string): Promise<AdminProfileDto> {
  const response = await getAdminApi(userId);
  const user = (response.data?.data ?? response.data) as AdminProfileDto;
  if (!user?.id) throw new Error("Profile not found");
  return user;
}

function applyAdminUserToForm(user: AdminProfileDto): AdminProfileForm {
  return {
    id: user.id ?? "",
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role != null ? String(user.role) : "",
  };
}

function PharmacyProfileImageField({
  profileImage,
  fileName,
  onImageChange,
  onRemove,
}: {
  profileImage: string;
  fileName: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pharmacy-profile-image-panel">
      <span className="pharmacy-profile-image-label">Profile Image</span>
      <div className="pharmacy-profile-image-preview">
        {profileImage ? (
          <img src={profileImage} className="pharmacy-profile-avatar" alt="Profile preview" />
        ) : (
          <FaUserCircle className="pharmacy-profile-placeholder" aria-hidden />
        )}
      </div>
      <div className="pharmacy-profile-file-row">
        <button
          type="button"
          className="pharmacy-profile-choose-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose File
        </button>
        <span className="pharmacy-profile-file-name">
          {fileName || "No file chosen"}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={onImageChange}
          className="pharmacy-profile-file-input"
        />
      </div>
      {profileImage && (
        <button type="button" className="pharmacy-profile-remove-btn" onClick={onRemove}>
          Remove Image
        </button>
      )}
    </div>
  );
}

function IconFormField({
  label,
  name,
  value,
  onChange,
  icon,
  required,
  placeholder,
  type = "text",
  className,
  disabled = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: FormChangeEvent) => void;
  icon: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "email";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`edit-profile-icon-field ${className ?? ""}`.trim()}>
      <label htmlFor={name}>
        {label}
        {required && <span className="star"> *</span>}
      </label>
      <div className="edit-profile-icon-input-wrap">
        <span className="edit-profile-input-icon" aria-hidden>
          {icon}
        </span>
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default function EditProfile() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const isPharmacyUser = isEmployee();

  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM);
  const [pharmacyForm, setPharmacyForm] = useState(EMPTY_PHARMACY_FORM);
  const [pharmacyMeta, setPharmacyMeta] = useState<PharmacyMeta>({ isActive: true });
  const [profileImage, setProfileImage] = useState("");
  const [profileImageFileName, setProfileImageFileName] = useState("");
  const [storedProfileImageFileName, setStoredProfileImageFileName] = useState<
    string | null
  >(null);
  const [pendingProfileImageFile, setPendingProfileImageFile] = useState<
    File | null | undefined
  >(undefined);
  const profileImageObjectUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);

  const revokeProfileImageObjectUrl = () => {
    if (profileImageObjectUrlRef.current) {
      URL.revokeObjectURL(profileImageObjectUrlRef.current);
      profileImageObjectUrlRef.current = null;
    }
  };

  useEffect(() => () => revokeProfileImageObjectUrl(), []);

  useEffect(() => {
    const loadProfile = async () => {
      const auth = getStoredAuth();
      if (!auth) {
        setLoading(false);
        return;
      }

      if (!isPharmacyUser) {
        if (!auth.id) {
          showError("User id is missing. Please log in again.");
          setLoading(false);
          return;
        }

        try {
          const user = await loadAdminProfile(auth.id);
          setAdminForm(applyAdminUserToForm(user));
          const savedFileName = user.profileImage?.trim() || null;
          setStoredProfileImageFileName(savedFileName);
          setPendingProfileImageFile(undefined);
          revokeProfileImageObjectUrl();
          setProfileImage(
            savedFileName
              ? resolveAdminProfileImageSrc(savedFileName) ?? ""
              : ""
          );
          setProfileImageFileName(savedFileName ? "Profile image" : "");
          mergeStoredAuth({
            name: user.name ?? auth.name,
            email: user.email ?? auth.email,
            role: user.role != null ? String(user.role) : auth.role,
            profileImage: savedFileName,
          });
        } catch {
          setAdminForm(applyAuthToAdminForm(auth));
          setProfileImage(
            resolveAdminProfileImageSrc(auth.profileImage ?? null) ?? ""
          );
          setProfileImageFileName(auth.profileImage ? "Profile image" : "");
          showError("Unable to load profile details");
        } finally {
          setLoading(false);
        }
        return;
      }

      setProfileImage(
        resolvePharmacyUserProfileImageSrc(auth.profileImage ?? null) ?? ""
      );

      if (!auth.id) {
        showError("User id is missing. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const user = await loadPharmacyUserProfile(auth.id);
        setPharmacyForm(applyPharmacyUserToForm(user));
        setPharmacyMeta({ role: user.role, isActive: user.isActive ?? true });
        const savedFileName = user.profileImage?.trim() || null;
        setStoredProfileImageFileName(savedFileName);
        setPendingProfileImageFile(undefined);
        revokeProfileImageObjectUrl();
        setProfileImage(
          savedFileName
            ? resolvePharmacyUserProfileImageSrc(savedFileName) ?? ""
            : ""
        );
        setProfileImageFileName(savedFileName ? "Profile image" : "");
        mergeStoredAuth(toPharmacyAuthPatch(user, auth));
      } catch {
        showError("Unable to load profile details");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [isPharmacyUser]);

  const handleAdminChange = ({ target: { name, value } }: FormChangeEvent) => {
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePharmacyChange = ({ target: { name, value } }: FormChangeEvent) => {
    setPharmacyForm((prev) => ({
      ...prev,
      [name]: name === "primaryContactPhone" ? sanitizePhoneInput(value) : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      showError("Image must be 2MB or smaller.");
      e.target.value = "";
      return;
    }

    revokeProfileImageObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    profileImageObjectUrlRef.current = objectUrl;
    setPendingProfileImageFile(file);
    setProfileImage(objectUrl);
    setProfileImageFileName(file.name);
  };

  const handleRemoveImage = () => {
    revokeProfileImageObjectUrl();
    setPendingProfileImageFile(null);
    setProfileImage("");
    setProfileImageFileName("");
  };

  const resolveProfileImageForSave = async (userId: string): Promise<string | null> => {
    if (pendingProfileImageFile === null) {
      return null;
    }

    if (pendingProfileImageFile instanceof File) {
      return isPharmacyUser
        ? uploadPharmacyProfileImage(pendingProfileImageFile, userId)
        : uploadAdminProfileImage(pendingProfileImageFile, userId);
    }

    return storedProfileImageFileName;
  };

  const savePharmacyProfile = async () => {
    const validationError = validatePharmacyForm(pharmacyForm);
    if (validationError) {
      showError(validationError);
      return;
    }

    let profileImageFileNameForSave: string | null;
    try {
      profileImageFileNameForSave = await resolveProfileImageForSave(pharmacyForm.id);
    } catch (err) {
      showError(messageFromApiBody(err) || "Profile image upload failed");
      return;
    }

    try {
      const saved = await dispatch(
        addPharmacyUser(
          buildPharmacyPayload(
            pharmacyForm,
            pharmacyMeta,
            profileImageFileNameForSave
          )
        )
      ).unwrap();

      const savedFileName = saved.profileImage?.trim() || null;
      setStoredProfileImageFileName(savedFileName);
      setPendingProfileImageFile(undefined);
      revokeProfileImageObjectUrl();
      setProfileImage(
        savedFileName
          ? resolvePharmacyUserProfileImageSrc(savedFileName) ?? ""
          : ""
      );
      setProfileImageFileName(savedFileName ? "Profile image" : "");

      mergeStoredAuth(
        toPharmacyAuthPatch(saved, {
          ...pharmacyForm,
          email: pharmacyForm.email,
          role: pharmacyMeta.role != null ? String(pharmacyMeta.role) : undefined,
          isActive: pharmacyMeta.isActive,
        })
      );
    } catch (err) {
      showError(messageFromApiBody(err) || "Update failed");
    }
  };

  const saveAdminProfileData = async () => {
    if (!adminForm.id) {
      showError("User id is missing. Please log in again.");
      return;
    }

    let profileImageFileNameForSave: string | null;
    try {
      profileImageFileNameForSave = await resolveProfileImageForSave(adminForm.id);
    } catch (err) {
      showError(messageFromApiBody(err) || "Profile image upload failed");
      return;
    }

    try {
      const saved = await dispatch(
        saveAdminProfile({
          ...adminForm,
          profileImage: profileImageFileNameForSave,
        })
      ).unwrap();

      const savedFileName = saved?.profileImage?.trim() || null;
      setStoredProfileImageFileName(savedFileName);
      setPendingProfileImageFile(undefined);
      revokeProfileImageObjectUrl();
      setProfileImage(
        savedFileName
          ? resolveAdminProfileImageSrc(savedFileName) ?? ""
          : ""
      );
      setProfileImageFileName(savedFileName ? "Profile image" : "");
    } catch (err) {
      showError(messageFromApiBody(err) || "Update failed");
    }
  };

  const handleSave = () =>
    isPharmacyUser ? savePharmacyProfile() : saveAdminProfileData();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/home");
  };

  if (loading) {
    return (
      <div className="edit-profile-page edit-profile-page--pharmacy">
        <div className="profile-card profile-card--pharmacy">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (isPharmacyUser) {
    return (
      <div className="edit-profile-page edit-profile-page--pharmacy">
        <div className="profile-card profile-card--pharmacy">
          <div className="edit-profile-header edit-profile-header--pharmacy">
            <IconButton
              onClick={handleBack}
              aria-label="Go back"
              size="small"
              className="edit-profile-back-btn"
              sx={BACK_BUTTON_SX}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <div className="edit-profile-heading">
              <h1>Edit Profile</h1>
              <p className="edit-profile-subtitle">
                Update your personal information and profile details.
              </p>
            </div>
          </div>

          <div className="edit-profile-body">
            <aside className="edit-profile-sidebar">
              <PharmacyProfileImageField
                profileImage={profileImage}
                fileName={profileImageFileName}
                onImageChange={handleImageChange}
                onRemove={handleRemoveImage}
              />
            </aside>

            <div className="edit-profile-form">
              <div className="edit-profile-form-row edit-profile-form-row--two">
                <IconFormField
                  label="Name"
                  name="name"
                  value={pharmacyForm.name}
                  onChange={handlePharmacyChange}
                  icon={<FaUser />}
                  placeholder="Enter name"
                />
                <IconFormField
                  label="Email"
                  name="email"
                  type="email"
                  value={pharmacyForm.email}
                  onChange={handlePharmacyChange}
                  icon={<FaEnvelope />}
                  placeholder="Enter email"
                />
              </div>

              <IconFormField
                label="Contact Name"
                name="primaryContactName"
                value={pharmacyForm.primaryContactName}
                onChange={handlePharmacyChange}
                icon={<FaUser />}
                required
                placeholder="Enter contact name"
                className="edit-profile-icon-field--full"
              />

              <div className="edit-profile-form-row edit-profile-form-row--two">
                <IconFormField
                  label="Contact Title"
                  name="primaryContactTitle"
                  value={pharmacyForm.primaryContactTitle}
                  onChange={handlePharmacyChange}
                  icon={<FaBriefcase />}
                  placeholder="Enter contact title"
                />
                <IconFormField
                  label="Contact Phone"
                  name="primaryContactPhone"
                  value={pharmacyForm.primaryContactPhone}
                  onChange={handlePharmacyChange}
                  icon={<FaPhone />}
                  required
                  placeholder="Enter contact phone"
                />
              </div>
            </div>
          </div>

          <div className="edit-profile-footer">
            <button
              type="button"
              className="edit-profile-cancel-btn"
              onClick={handleBack}
            >
              Cancel
            </button>
            <button
              type="button"
              className="edit-profile-save-btn"
              onClick={() => void handleSave()}
            >
              <FaSave aria-hidden />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-page edit-profile-page--pharmacy">
      <div className="profile-card profile-card--pharmacy">
        <div className="edit-profile-header edit-profile-header--pharmacy">
          <IconButton
            onClick={handleBack}
            aria-label="Go back"
            size="small"
            className="edit-profile-back-btn"
            sx={BACK_BUTTON_SX}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <div className="edit-profile-heading">
            <h1>Edit Profile</h1>
            <p className="edit-profile-subtitle">
              Update your personal information and profile details.
            </p>
          </div>
        </div>

        <div className="edit-profile-body">
          <aside className="edit-profile-sidebar">
            <PharmacyProfileImageField
              profileImage={profileImage}
              fileName={profileImageFileName}
              onImageChange={handleImageChange}
              onRemove={handleRemoveImage}
            />
          </aside>

          <div className="edit-profile-form">
            <div className="edit-profile-form-row edit-profile-form-row--two">
              <IconFormField
                label="Name"
                name="name"
                value={adminForm.name}
                onChange={handleAdminChange}
                icon={<FaUser />}
                placeholder="Enter name"
              />
              <IconFormField
                label="Email"
                name="email"
                type="email"
                value={adminForm.email}
                onChange={handleAdminChange}
                icon={<FaEnvelope />}
                placeholder="Enter email"
              />
            </div>

            <IconFormField
              label="Role"
              name="role"
              value={adminForm.role}
              onChange={handleAdminChange}
              icon={<FaBriefcase />}
              placeholder="Enter role"
              className="edit-profile-icon-field--full"
              disabled
            />
          </div>
        </div>

        <div className="edit-profile-footer">
          <button
            type="button"
            className="edit-profile-cancel-btn"
            onClick={handleBack}
          >
            Cancel
          </button>
          <button
            type="button"
            className="edit-profile-save-btn"
            onClick={() => void handleSave()}
          >
            <FaSave aria-hidden />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
