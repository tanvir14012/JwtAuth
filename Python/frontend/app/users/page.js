"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getAuthStatus } from "../../lib/api";

const emptyUser = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  country: "",
  shortBio: ""
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [edit, setEdit] = useState(emptyUser);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    const { body, status } = await apiRequest("/profile/getAll");
    if (status === 423) {
      router.push("/unlock-session");
      return;
    }
    setUsers(body || []);
  };

  useEffect(() => {
    const auth = getAuthStatus();
    if (!auth) {
      router.replace("/sign-in");
      return;
    }
    if (auth.userType !== "0") {
      router.replace("/home");
      return;
    }
    loadUsers();
  }, [router]);

  const save = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const data = new FormData();
    Object.entries(edit).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    const route = edit.id ? "/profile/updateDetailsByAdmin" : "/profile/createUser";
    const { body } = await apiRequest(route, { method: "POST", body: data });

    if (Array.isArray(body)) {
      setError(body.join(", "));
      return;
    }
    setEdit(emptyUser);
    setMessage(edit.id ? "User updated." : "User created.");
    await loadUsers();
  };

  const onDelete = async (id) => {
    const ok = window.confirm("Delete this user?");
    if (!ok) return;
    const { body } = await apiRequest(`/profile/deleteUser/${id}`, { method: "DELETE" });
    if (body === true) {
      setMessage("User deleted.");
      await loadUsers();
    } else {
      setError("Delete failed.");
    }
  };

  return (
    <div className="card">
      <h2>Users (Admin)</h2>
      <form onSubmit={save}>
        <input value={edit.firstName} placeholder="First name" onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} required />
        <input value={edit.lastName} placeholder="Last name" onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} />
        <input value={edit.email} type="email" placeholder="Email" onChange={(e) => setEdit({ ...edit, email: e.target.value })} required />
        <input
          value={edit.phoneNumber}
          placeholder="Phone number"
          onChange={(e) => setEdit({ ...edit, phoneNumber: e.target.value })}
        />
        <input
          value={edit.addressLine1}
          placeholder="Address line 1"
          onChange={(e) => setEdit({ ...edit, addressLine1: e.target.value })}
        />
        <input
          value={edit.addressLine2}
          placeholder="Address line 2"
          onChange={(e) => setEdit({ ...edit, addressLine2: e.target.value })}
        />
        <input value={edit.country} placeholder="Country" onChange={(e) => setEdit({ ...edit, country: e.target.value })} />
        <textarea value={edit.shortBio} placeholder="Short bio" onChange={(e) => setEdit({ ...edit, shortBio: e.target.value })} />
        <button type="submit">{edit.id ? "Update user" : "Create user (default password: User@123)"}</button>
        {edit.id && <button onClick={() => setEdit(emptyUser)}>Cancel edit</button>}
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{`${user.firstName || ""} ${user.lastName || ""}`.trim()}</td>
              <td>{user.email}</td>
              <td>
                <button onClick={() => setEdit(user)}>Edit</button>{" "}
                <button onClick={() => onDelete(user.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

