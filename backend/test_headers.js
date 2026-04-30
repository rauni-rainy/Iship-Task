fetch("https://iship-backend-140680379311.us-central1.run.app/api/auth/csrf-token", {
  method: "GET",
}).then(r => {
  console.log(r.status);
  for (let [key, val] of r.headers) {
    console.log(key, ":", val);
  }
}).catch(console.error);
