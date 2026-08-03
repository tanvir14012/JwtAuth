export const patterns = {
  name: /^[A-Za-z ]{1,25}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,64}$/,
  phone: /^[+]?[0-9]+$/
};

export const isAdmin = (user) => user?.role === "admin";

export const toProfileDto = (user) => ({
  id: user._id.toString(),
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  email: user.email || "",
  phoneNumber: user.phoneNumber || "",
  addressLine1: user.addressLine1 || "",
  addressLine2: user.addressLine2 || "",
  country: user.country || "",
  profilePicUrl: user.profilePicUrl || "",
  shortBio: user.shortBio || ""
});

