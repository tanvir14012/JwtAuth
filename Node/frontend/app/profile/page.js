"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getAuthStatus } from "../../lib/api";

const initialUser = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  country: "",
  shortBio: ""
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuthStatus();
    if (!auth) {
      router.replace("/sign-in");
      return;
    }
    if (auth.isSessionLocked) {
      router.replace("/unlock-session");
      return;
    }

    apiRequest("/profile/getDetails").then(({ body, status }) => {
      if (status === 423) {
        router.replace("/unlock-session");
        return;
      }
      setUser({ ...initialUser, ...body });
      setPreviewUrl(body.profilePicUrl || "");
    });
  }, [router]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const data = new FormData();
    Object.entries(user).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });
    if (profilePicture) data.append("profilePicture", profilePicture);

    const { body, status } = await apiRequest("/profile/updateDetails", {
      method: "POST",
      body: data
    });

    if (status === 423) {
      router.push("/unlock-session");
      return;
    }
    if (Array.isArray(body)) {
      setError(body.join(", "));
      return;
    }

    setUser({ ...initialUser, ...body });
    setPreviewUrl(body.profilePicUrl || "");
    setMessage("Profile updated.");
  };

  return (
    <div className="card">
      <h2>Profile</h2>
      <form onSubmit={submit}>
        <input value={user.firstName} placeholder="First name" onChange={(e) => setUser({ ...user, firstName: e.target.value })} />
        <input value={user.lastName} placeholder="Last name" onChange={(e) => setUser({ ...user, lastName: e.target.value })} />
        <input value={user.email} type="email" placeholder="Email" onChange={(e) => setUser({ ...user, email: e.target.value })} />
        <input
          value={user.phoneNumber}
          placeholder="Phone number"
          onChange={(e) => setUser({ ...user, phoneNumber: e.target.value })}
        />
        <input
          value={user.addressLine1}
          placeholder="Address line 1"
          onChange={(e) => setUser({ ...user, addressLine1: e.target.value })}
        />
        <input
          value={user.addressLine2}
          placeholder="Address line 2"
          onChange={(e) => setUser({ ...user, addressLine2: e.target.value })}
        />
        <input value={user.country} placeholder="Country" onChange={(e) => setUser({ ...user, country: e.target.value })} />
        <textarea value={user.shortBio} placeholder="Short bio" onChange={(e) => setUser({ ...user, shortBio: e.target.value })} />
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.tiff"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            setProfilePicture(file);
            setPreviewUrl(file ? URL.createObjectURL(file) : previewUrl);
          }}
        />
        {previewUrl && <img src={previewUrl} alt="Profile preview" width="120" />}
        <button type="submit">Save profile</button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

