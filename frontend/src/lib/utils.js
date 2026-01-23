fetch("https://finance-hub-488.preview.emergentagent.com/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({
    email,
    password,
  }),
});
